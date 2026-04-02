// 今日の予約者（診察済み＋本日予約）へSquare決済障害の案内を一斉送信
// 使い方: node scripts/send-square-notice.mjs [--dry-run]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env.local読み込み
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z_0-9]*)=["']?([^"']*)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import pg from "pg";
const { Client } = pg;

const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(
  /https:\/\/([^.]+)\.supabase\.co/,
  "$1"
);

const client = new Client({
  host: "aws-1-ap-northeast-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const LINE_TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;
const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DRY_RUN = process.argv.includes("--dry-run");
const TODAY = "2026-04-02";

const MESSAGE_TEXT = `本日14時以降からクレジットカード決済にエラーが生じているようで、現在原因を確認しております。
すでに決済が完了している方につきましては問題なく注文は受けられております。
明日には復旧する見通しとなっており、ご迷惑をおかけして誠に申し訳ありません。

クレジットカード決済の復旧後で明日の12時までに決済をしていただいた場合は明日の発送となります。
復旧後に再度配信をさせていただきますのでよろしくお願いいたします。
なお、銀行振込は問題なく使用可能となっております。`;

async function main() {
  await client.connect();

  // 1) 診察済み（intake.status = 'OK'）の全患者
  const { rows: diagnosedRows } = await client.query(
    `SELECT DISTINCT i.patient_id, p.line_id, p.name
     FROM intake i
     JOIN patients p ON i.patient_id = p.patient_id AND i.tenant_id = p.tenant_id
     WHERE i.status = 'OK'
       AND i.tenant_id = $1`,
    [TENANT_ID]
  );

  // 2) 今日の予約者（キャンセル除外）
  const { rows: todayRows } = await client.query(
    `SELECT DISTINCT r.patient_id, p.line_id, p.name
     FROM reservations r
     JOIN patients p ON r.patient_id = p.patient_id AND r.tenant_id = p.tenant_id
     WHERE r.reserved_date = $1
       AND r.status != 'canceled'
       AND r.tenant_id = $2`,
    [TODAY, TENANT_ID]
  );

  // 重複排除して統合
  const targetMap = new Map();
  for (const row of [...diagnosedRows, ...todayRows]) {
    if (!targetMap.has(row.patient_id)) {
      targetMap.set(row.patient_id, row);
    }
  }
  const targets = Array.from(targetMap.values());

  console.log(`診察済み: ${diagnosedRows.length}人, 今日の予約: ${todayRows.length}人`);

  // ブロック中を除外
  const pids = targets.map((t) => t.patient_id);
  let blockedSet = new Set();
  if (pids.length > 0) {
    const { rows: blocked } = await client.query(
      `SELECT patient_id FROM friend_summaries
       WHERE patient_id = ANY($1) AND last_event_type = 'unfollow' AND tenant_id = $2`,
      [pids, TENANT_ID]
    );
    blockedSet = new Set(blocked.map((b) => b.patient_id));
  }

  // LINE ID持ち＆ブロックなしのみ
  const sendable = targets.filter(
    (t) => t.line_id && !blockedSet.has(t.patient_id)
  );
  const noLine = targets.filter((t) => !t.line_id);

  console.log(`本日の予約者: ${targets.length}人`);
  console.log(`LINE送信可能: ${sendable.length}人`);
  console.log(`LINE未連携: ${noLine.length}人`);
  console.log(`ブロック中: ${blockedSet.size}人`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] 送信対象:");
    for (const t of sendable) {
      console.log(
        `  ${t.reserved_time} ${t.status === "OK" ? "済" : "未"} ${t.name} (${t.patient_id})`
      );
    }
    if (noLine.length > 0) {
      console.log("\n[LINE未連携]:");
      for (const t of noLine) {
        console.log(`  ${t.reserved_time} ${t.name} (${t.patient_id})`);
      }
    }
    console.log("\nメッセージ:");
    console.log(MESSAGE_TEXT);
    await client.end();
    return;
  }

  let sent = 0;
  let failed = 0;
  const BATCH_SIZE = 10;

  for (let i = 0; i < sendable.length; i += BATCH_SIZE) {
    const batch = sendable.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (t) => {
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LINE_TOKEN}`,
          },
          body: JSON.stringify({
            to: t.line_id,
            messages: [{ type: "text", text: MESSAGE_TEXT }],
          }),
        });

        const status = res.ok ? "sent" : "failed";

        // message_log記録
        await client.query(
          `INSERT INTO message_log (tenant_id, patient_id, line_uid, direction, event_type, message_type, content, status)
           VALUES ($1, $2, $3, 'outgoing', 'message', 'text', $4, $5)`,
          [TENANT_ID, t.patient_id, t.line_id, MESSAGE_TEXT, status]
        );

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`${t.name}: ${err}`);
        }
        console.log(`  ✓ ${t.name}`);
        return true;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        failed++;
        console.error("  ✗", r.reason?.message || r.reason);
      }
    }
  }

  console.log(`\n完了: 送信成功 ${sent}人, 失敗 ${failed}人`);
  await client.end();
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
