const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const msg = `先ほどお送りしたリマインドメッセージにて、予約日時の表記に誤りがございました。

誤：2月20日(金)
正：2月21日(土)

ご迷惑をおかけし申し訳ございません。
本日のご予約でお間違いございませんので、ご安心ください。`;

async function main() {
  const { data: logs } = await sb.from("message_log")
    .select("patient_id, line_uid, tenant_id")
    .eq("message_type", "reminder")
    .gte("sent_at", "2026-02-20T23:00:00Z")
    .lte("sent_at", "2026-02-21T00:00:00Z");

  const seen = new Set();
  const rows = [];
  for (const l of (logs || [])) {
    if (l.line_uid && !seen.has(l.line_uid)) {
      seen.add(l.line_uid);
      rows.push({
        patient_id: l.patient_id,
        line_uid: l.line_uid,
        tenant_id: l.tenant_id,
        message_type: "reminder",
        content: msg,
        status: "sent",
        direction: "outgoing",
      });
    }
  }

  const { error } = await sb.from("message_log").insert(rows);
  if (error) console.error("エラー:", error.message);
  else console.log("message_log記録完了:", rows.length, "件");
}

main().catch(console.error);
