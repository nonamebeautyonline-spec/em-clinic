// 2/21 当日リマインドの日付誤表記訂正メッセージ送信
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CORRECTION_MESSAGE = `先ほどお送りしたリマインドメッセージにて、予約日時の表記に誤りがございました。

誤：2月20日(金)
正：2月21日(土)

ご迷惑をおかけし申し訳ございません。
本日のご予約でお間違いございませんので、ご安心ください。`;

async function main() {
  // 今朝送信した当日リマインドの対象者を取得
  const { data: logs } = await sb.from("message_log")
    .select("patient_id, line_uid")
    .eq("message_type", "reminder")
    .gte("sent_at", "2026-02-20T23:00:00Z")
    .lte("sent_at", "2026-02-21T00:00:00Z");

  if (!logs || logs.length === 0) {
    console.log("送信対象なし");
    return;
  }

  // 重複排除（同一line_uid）
  const seen = new Set();
  const targets = [];
  for (const l of logs) {
    if (l.line_uid && !seen.has(l.line_uid)) {
      seen.add(l.line_uid);
      targets.push(l);
    }
  }
  console.log(`送信対象: ${targets.length}人`);

  // LINEトークン取得
  const { data: setting } = await sb.from("tenant_settings")
    .select("value")
    .eq("key", "line_channel_access_token")
    .limit(1)
    .single();
  const token = setting?.value || process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error("LINEトークンが見つかりません");
    return;
  }

  let sent = 0;
  let failed = 0;
  const BATCH = 10;

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (t) => {
      try {
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: t.line_uid,
            messages: [{ type: "text", text: CORRECTION_MESSAGE }],
          }),
        });
        return res.ok ? 1 : 0;
      } catch {
        return 0;
      }
    }));
    const batchSent = results.reduce((a, b) => a + b, 0);
    sent += batchSent;
    failed += results.length - batchSent;
    console.log(`  バッチ ${Math.floor(i / BATCH) + 1}: ${batchSent}/${results.length} 成功`);
  }

  console.log(`\n完了: 送信${sent}件, 失敗${failed}件`);
}

main().catch(console.error);
