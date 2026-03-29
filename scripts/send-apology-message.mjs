// 昨日発送分の追跡通知遅延お詫びメッセージ送信スクリプト
// 使い方: node scripts/send-apology-message.mjs [--dry-run]
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

const MESSAGE_TEXT =
  "昨日発送済みとなっておりましたが、通知が送信されていなかったようです。申し訳ありません。\n配送状況に関して上記よりご確認いただけますと幸いです。";

async function main() {
  await client.connect();

  // 今日shipping_dateが設定された＆shipped＆追跡番号ありの注文（＝さっき通知した人たち）
  const today = new Date().toISOString().split("T")[0];
  const { rows: orders } = await client.query(
    `SELECT DISTINCT o.patient_id, p.line_id, p.name
     FROM orders o
     JOIN patients p ON o.patient_id = p.patient_id AND o.tenant_id = p.tenant_id
     WHERE o.shipping_date = $1
       AND o.shipping_status = 'shipped'
       AND o.tracking_number IS NOT NULL
       AND o.tenant_id = $2
       AND p.line_id IS NOT NULL`,
    [today, TENANT_ID]
  );

  // ブロック中を除外
  const pids = orders.map((o) => o.patient_id);
  let blockedSet = new Set();
  if (pids.length > 0) {
    const { rows: blocked } = await client.query(
      `SELECT patient_id FROM friend_summaries
       WHERE patient_id = ANY($1) AND last_event_type = 'unfollow' AND tenant_id = $2`,
      [pids, TENANT_ID]
    );
    blockedSet = new Set(blocked.map((b) => b.patient_id));
  }

  const sendable = orders.filter((o) => !blockedSet.has(o.patient_id));

  console.log(`対象: ${sendable.length}人（ブロック除外: ${blockedSet.size}人）`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] 送信対象:");
    for (const o of sendable) {
      console.log(`  ${o.name} (${o.patient_id}) → ${o.line_id}`);
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
      batch.map(async (o) => {
        // LINE push
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LINE_TOKEN}`,
          },
          body: JSON.stringify({
            to: o.line_id,
            messages: [{ type: "text", text: MESSAGE_TEXT }],
          }),
        });

        const status = res.ok ? "sent" : "failed";

        // message_log記録
        await client.query(
          `INSERT INTO message_log (tenant_id, patient_id, line_uid, direction, event_type, message_type, content, status)
           VALUES ($1, $2, $3, 'outgoing', 'message', 'text', $4, $5)`,
          [TENANT_ID, o.patient_id, o.line_id, MESSAGE_TEXT, status]
        );

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`${o.name}: ${err}`);
        }
        return true;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        failed++;
        console.error(r.reason?.message || r.reason);
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
