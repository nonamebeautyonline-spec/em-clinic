// 今日のリマインド送信先に追加メッセージを送信
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LINE_API = "https://api.line.me/v2/bot/message";
const token = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN;

const FOLLOWUP_MESSAGE = `先ほどのメッセージに一部誤りがあり、本日は090-ではなく、050-から始まる電話番号からの発信となります。お手数おかけして申し訳ありません。`;

async function main() {
  // 直近のリマインド送信済みのline_uidを取得（2026-02-14 JST = 2026-02-13T15:00:00Z以降）
  const { data: logs, error } = await supabase
    .from("message_log")
    .select("patient_id, line_uid")
    .eq("message_type", "reminder")
    .eq("status", "sent")
    .gte("sent_at", "2026-02-13T15:00:00Z")
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("message_log取得エラー:", error.message);
    process.exit(1);
  }

  if (!logs || logs.length === 0) {
    console.log("リマインド送信履歴が見つかりません");
    process.exit(0);
  }

  // line_uidでユニーク化
  const uidSet = new Set();
  const uniqueRecipients = [];
  for (const log of logs) {
    if (log.line_uid && !uidSet.has(log.line_uid)) {
      uidSet.add(log.line_uid);
      uniqueRecipients.push(log);
    }
  }

  console.log(`対象: ${uniqueRecipients.length}人`);
  console.log(`メッセージ: ${FOLLOWUP_MESSAGE}`);
  console.log("---");

  // multicastで送信（500人ずつ）
  const lineIds = uniqueRecipients.map(r => r.line_uid);

  for (let i = 0; i < lineIds.length; i += 500) {
    const batch = lineIds.slice(i, i + 500);
    const res = await fetch(`${LINE_API}/multicast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: batch,
        messages: [{ type: "text", text: FOLLOWUP_MESSAGE }],
      }),
    });

    if (res.ok) {
      console.log(`送信成功: ${batch.length}人`);
    } else {
      const text = await res.text().catch(() => "");
      console.error(`送信エラー: ${res.status}`, text);
    }
  }

  // message_logに記録
  const logEntries = uniqueRecipients.map(r => ({
    patient_id: r.patient_id,
    line_uid: r.line_uid,
    direction: "outgoing",
    event_type: "message",
    message_type: "reminder",
    content: FOLLOWUP_MESSAGE,
    status: "sent",
  }));

  const { error: logError } = await supabase.from("message_log").insert(logEntries);
  if (logError) {
    console.error("ログ記録エラー:", logError.message);
  } else {
    console.log(`message_logに${logEntries.length}件記録`);
  }

  console.log("完了");
}

main();
