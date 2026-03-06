// 2026/2/25以降登録の未診察＆未予約患者へリマインド配信
// + broadcasts + message_log に記録
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);
const LINE_TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

const MESSAGE = `当院でまだ診察を受けていない方に配信しています。
既に予約を取られていて行き違いの場合は申し訳ありません。

マイページより予約が可能となっております。
今週は比較的に予約が取りやすくなっておりますが、来週以降予約が早めに埋まることが予想されます。
処方を希望される場合はお早めに予約を取ることをお勧めします。

何かわからないことがありましたらお気軽にご相談ください🌸`;

const FILTER_RULES = {
  include: {
    operator: "AND",
    conditions: [
      { type: "registered_date", operator: ">=", value: "2026-02-25" },
      { type: "intake_status", value: "none" },
      { type: "reservation_status", value: "none" },
    ],
  },
  exclude: { conditions: [] },
};

async function pushMessage(lineUserId, text) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error(`  LINE Push Error ${res.status}: ${err}`);
  }
  return res;
}

async function main() {
  const today = new Date().toISOString().split("T")[0];

  // 1) 2026-02-25以降に登録された患者を取得
  const { data: patients, error: pErr } = await supabase
    .from("patients")
    .select("patient_id, name, line_id, created_at")
    .eq("tenant_id", TENANT_ID)
    .gte("created_at", "2026-02-25T00:00:00+09:00");
  if (pErr) { console.error("patients取得エラー:", pErr.message); return; }
  console.log(`2/25以降登録患者: ${patients.length}人`);

  // 2) 診察済み患者を除外 (intake.status = OK or NG)
  const pids = patients.map(p => p.patient_id);
  const { data: intakes } = await supabase
    .from("intake")
    .select("patient_id, status")
    .eq("tenant_id", TENANT_ID)
    .in("patient_id", pids);
  const diagnosedSet = new Set();
  for (const row of intakes || []) {
    if (row.status === "OK" || row.status === "NG") diagnosedSet.add(row.patient_id);
  }
  console.log(`うち診察済み: ${diagnosedSet.size}人`);

  // 3) アクティブ予約がある患者を除外
  const { data: reservations } = await supabase
    .from("reservations")
    .select("patient_id")
    .eq("tenant_id", TENANT_ID)
    .in("patient_id", pids)
    .gte("reserved_date", today)
    .neq("status", "canceled");
  const hasReservation = new Set((reservations || []).map(r => r.patient_id));
  console.log(`うちアクティブ予約あり: ${hasReservation.size}人`);

  // 4) LINE ID がある未診察＆未予約患者
  const targets = patients.filter(p =>
    !diagnosedSet.has(p.patient_id) &&
    !hasReservation.has(p.patient_id) &&
    p.line_id
  );
  const noLineTargets = patients.filter(p =>
    !diagnosedSet.has(p.patient_id) &&
    !hasReservation.has(p.patient_id) &&
    !p.line_id
  );

  console.log(`\n=== 配信対象 ===`);
  console.log(`送信可能（LINE ID あり）: ${targets.length}人`);
  console.log(`LINE ID なし: ${noLineTargets.length}人`);
  console.log(`合計対象: ${targets.length + noLineTargets.length}人`);
  console.log(`\nメッセージ:\n${MESSAGE}\n`);
  console.log("-".repeat(60));

  // DRY RUN チェック
  if (process.argv.includes("--dry-run")) {
    console.log("\n[DRY RUN] 実際の送信はスキップします");
    for (const t of targets.slice(0, 10)) {
      console.log(`  ${t.name || "(名前なし)"} (${t.patient_id})`);
    }
    if (targets.length > 10) console.log(`  ... 他 ${targets.length - 10}人`);
    return;
  }

  // 5) broadcasts レコード作成
  const { data: broadcast, error: bErr } = await supabase
    .from("broadcasts")
    .insert({
      tenant_id: TENANT_ID,
      name: "未診察＆未予約リマインド（2/25以降登録）",
      filter_rules: FILTER_RULES,
      message_content: MESSAGE,
      status: "sending",
      total_targets: targets.length + noLineTargets.length,
      created_by: "admin",
    })
    .select()
    .single();
  if (bErr) { console.error("broadcast作成エラー:", bErr.message); return; }
  console.log(`broadcast ID: ${broadcast.id}`);

  // 6) LINE ID なしを message_log に記録
  if (noLineTargets.length > 0) {
    await supabase.from("message_log").insert(
      noLineTargets.map(t => ({
        tenant_id: TENANT_ID,
        patient_id: t.patient_id,
        event_type: "message",
        message_type: "broadcast",
        content: MESSAGE,
        status: "no_uid",
        campaign_id: broadcast.id,
        direction: "outgoing",
      }))
    );
  }

  // 7) 送信（10件ずつバッチ）
  let sent = 0;
  let failed = 0;
  const BATCH = 10;

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (t) => {
        const res = await pushMessage(t.line_id, MESSAGE);
        const status = res.ok ? "sent" : "failed";

        await supabase.from("message_log").insert({
          tenant_id: TENANT_ID,
          patient_id: t.patient_id,
          line_uid: t.line_id,
          direction: "outgoing",
          event_type: "message",
          message_type: "broadcast",
          content: MESSAGE,
          status,
          campaign_id: broadcast.id,
        });

        if (res.ok) {
          process.stdout.write(".");
          return true;
        } else {
          process.stdout.write("x");
          return false;
        }
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sent++;
      else failed++;
    }
  }

  // 8) broadcast レコード更新
  await supabase.from("broadcasts").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    sent_count: sent,
    failed_count: failed,
    no_uid_count: noLineTargets.length,
  }).eq("id", broadcast.id);

  console.log(`\n\n${"=".repeat(60)}`);
  console.log(`送信完了: ${sent}人成功 / ${failed}人失敗 / ${noLineTargets.length}人LINE ID無`);
}

main().catch(console.error);
