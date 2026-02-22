const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const LINE_API = "https://api.line.me/v2/bot/message/push";
const RULE_ID = 1;
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

const targets = [
  { patient_id: "20260200570", name: "鈴木泰子", line_uid: "Uc394d7f68650ae8456b37f131e8054e6" },
  { patient_id: "20260200580", name: "土屋衣織", line_uid: "U41672153fe3b7b0ee7260ee9ad7e84e0" },
];

function formatDateTime(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[dt.getUTCDay()];
  const hhmm = timeStr.slice(0, 5);
  const [hh, mm] = hhmm.split(":").map(Number);
  const endTotal = hh * 60 + mm + 15;
  const endHH = Math.floor(endTotal / 60);
  const endMM = endTotal % 60;
  const endTime = `${endHH}:${String(endMM).padStart(2, "0")}`;
  return `${m}/${d}(${weekday}) ${hhmm}〜${endTime}`;
}

(async () => {
  const token = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

  for (const t of targets) {
    // 予約取得
    const { data: res } = await sb
      .from("reservations")
      .select("id, reserved_date, reserved_time")
      .eq("patient_id", t.patient_id)
      .eq("reserved_date", "2026-02-20")
      .neq("status", "canceled")
      .maybeSingle();

    if (res === null) {
      console.log("SKIP (予約なし):", t.name);
      continue;
    }

    const formatted = formatDateTime(res.reserved_date, res.reserved_time);
    const colors = { headerBg: "#4A90D9", headerText: "#FFFFFF", bodyText: "#555555", accentColor: "#4A90D9" };

    const flex = {
      type: "flex",
      altText: "\u3010明日のご予約\u3011" + formatted,
      contents: {
        type: "bubble",
        header: {
          type: "box", layout: "vertical",
          contents: [{ type: "text", text: "明日のご予約", weight: "bold", size: "lg", color: colors.headerText }],
          backgroundColor: colors.headerBg, paddingAll: "16px",
        },
        body: {
          type: "box", layout: "vertical",
          contents: [
            {
              type: "box", layout: "vertical",
              contents: [
                { type: "text", text: "予約日時", size: "sm", color: colors.bodyText },
                { type: "text", text: formatted, size: "xl", weight: "bold", margin: "sm", color: colors.accentColor },
              ],
            },
            { type: "separator", margin: "md" },
            {
              type: "text",
              text: "明日のご予約がございます。\n変更・キャンセルをご希望の場合は、マイページよりお手続きをお願いいたします。",
              size: "sm", color: colors.bodyText, wrap: true, margin: "md",
            },
          ],
          paddingAll: "16px",
        },
      },
    };

    const apiRes = await fetch(LINE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ to: t.line_uid, messages: [{ type: "flex", altText: flex.altText, contents: flex.contents }] }),
    });

    await sb.from("reminder_sent_log").insert({ tenant_id: TENANT_ID, rule_id: RULE_ID, reservation_id: res.id });

    if (apiRes.ok) {
      await sb.from("message_log").insert({
        tenant_id: TENANT_ID, patient_id: t.patient_id, line_uid: t.line_uid,
        message_type: "reminder", content: flex.altText, flex_json: flex.contents, status: "sent", direction: "outgoing",
      });
      console.log("OK:", t.name, res.reserved_time);
    } else {
      const errText = await apiRes.text().catch(() => "");
      console.error("FAIL:", t.name, apiRes.status, errText);
    }
  }
})();
