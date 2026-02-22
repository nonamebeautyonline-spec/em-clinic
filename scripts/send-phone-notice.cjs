// 本日予約で未診察（intake.status=null）の患者に電話番号変更メッセージを送信
require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

const MSG = "本日電話の調子が悪く、03-から始まる番号でおかけします。";

async function pushText(lineUid, text) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ to: lineUid, messages: [{ type: "text", text }] }),
  });
  return { ok: res.ok, status: res.status };
}

(async () => {
  const now = new Date();
  const today = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  console.log("今日:", today);

  // 今日のアクティブ予約
  const { data: reservations, error: rErr } = await sb.from("reservations")
    .select("reserve_id, patient_id, patient_name, reserved_time, status")
    .eq("reserved_date", today)
    .eq("status", "pending");

  if (rErr) { console.error("予約取得エラー:", rErr.message); return; }
  console.log("本日アクティブ予約:", (reservations || []).length, "件");
  if (!reservations || reservations.length === 0) return;

  // intake で status を確認
  const rids = reservations.map(r => r.reserve_id);
  const { data: intakes } = await sb.from("intake")
    .select("reserve_id, patient_id, patient_name, status, line_id")
    .in("reserve_id", rids);

  const intakeMap = new Map();
  for (const row of (intakes || [])) {
    intakeMap.set(row.reserve_id, row);
  }

  const targets = [];
  for (const r of reservations) {
    const intake = intakeMap.get(r.reserve_id);
    if (!intake) continue;
    // 未診察 = intake.status が null
    if (intake.status !== null && intake.status !== undefined) continue;
    if (!intake.line_id) continue;
    // 除外リスト
    if (["20260200517"].includes(r.patient_id)) continue;
    targets.push({
      patient_id: r.patient_id,
      patient_name: r.patient_name,
      reserved_time: r.reserved_time,
      line_id: intake.line_id,
    });
  }

  console.log("未診察 + LINE送信可:", targets.length, "件\n");

  if (targets.length === 0) {
    console.log("対象者なし");
    return;
  }

  // プレビュー
  for (const t of targets) {
    console.log("  " + t.patient_name + " (" + t.patient_id + ") " + t.reserved_time);
  }

  // DRY RUN チェック
  if (process.argv.includes("--send")) {
    console.log("\n--- 送信開始 ---");
    let sent = 0;
    let failed = 0;
    for (const t of targets) {
      try {
        const res = await pushText(t.line_id, MSG);
        if (res.ok) {
          // message_log に記録
          await sb.from("message_log").insert({
            patient_id: t.patient_id,
            line_uid: t.line_id,
            direction: "outgoing",
            event_type: "message",
            message_type: "individual",
            content: MSG,
            status: "sent",
          });
          sent++;
          console.log("  ✅ " + t.patient_name);
        } else {
          failed++;
          console.log("  ❌ " + t.patient_name + " (HTTP " + res.status + ")");
        }
      } catch (err) {
        failed++;
        console.log("  ❌ " + t.patient_name + " エラー: " + err.message);
      }
    }
    console.log("\n送信完了: " + sent + "件成功, " + failed + "件失敗");
  } else {
    console.log("\n⚠️  プレビューモードです。実際に送信するには --send オプションを付けてください:");
    console.log("    node scripts/send-phone-notice.cjs --send");
  }
})();
