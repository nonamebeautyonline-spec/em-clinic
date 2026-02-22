// 手動で1人だけ送信テスト（当日リマインド テキスト版）
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const LINE_API = "https://api.line.me/v2/bot/message/push";

(async () => {
  const token = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;
  console.log("token length:", token ? token.length : "MISSING");

  // ルール2の情報
  const { data: rule } = await sb.from("reminder_rules").select("*").eq("id", 2).maybeSingle();
  console.log("rule tenant_id:", rule.tenant_id);

  // getSettingOrEnv のシミュレーション
  const { data: setting } = await sb
    .from("tenant_settings")
    .select("value")
    .eq("category", "line")
    .eq("key", "channel_access_token")
    .eq("tenant_id", rule.tenant_id)
    .maybeSingle();
  console.log("tenant_settings token:", setting ? "found (length=" + setting.value.length + ")" : "NOT FOUND → env fallback");

  // env fallback テスト
  if (!setting) {
    console.log("env token available:", token ? "yes" : "NO");
  }

  // 未送信の1人目を取得
  const { data: reservations } = await sb
    .from("reservations")
    .select("id, patient_id, patient_name, reserved_date, reserved_time")
    .eq("reserved_date", "2026-02-20")
    .neq("status", "canceled")
    .limit(1);

  if (!reservations || reservations.length === 0) {
    console.log("予約なし");
    return;
  }

  const r = reservations[0];
  const { data: patient } = await sb.from("patients").select("patient_id, name, line_id").eq("patient_id", r.patient_id).maybeSingle();
  console.log("\nテスト対象:", patient.name, "line_id:", patient.line_id ? "あり" : "なし");

  if (!patient.line_id) {
    console.log("LINE IDなし、別の患者で試します");
    return;
  }

  // テンプレート適用
  const dateStr = "2026年2月20日(金)";
  const timeStr = r.reserved_time.substring(0, 5);
  const text = rule.message_template
    .replace(/\{name\}/g, patient.name || "")
    .replace(/\{date\}/g, dateStr)
    .replace(/\{time\}/g, timeStr)
    .replace(/\{patient_id\}/g, r.patient_id);

  console.log("message length:", text.length);
  console.log("message preview:", text.substring(0, 80) + "...");

  // LINE送信テスト
  const res = await fetch(LINE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      to: patient.line_id,
      messages: [{ type: "text", text }],
    }),
  });

  console.log("\nLINE API response:", res.status, res.ok ? "OK" : "FAIL");
  if (!res.ok) {
    const body = await res.text();
    console.log("error body:", body);
  }
})();
