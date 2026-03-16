// 今日の予約者33名にLINEメッセージ送信
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z_0-9]*)=["']?([^"']*)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MESSAGE_TEXT = "本日電話の調子が悪く、050-から始まる番号よりおかけします。よろしくお願いいたします。";
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

async function getToken() {
  // tenant_settingsから取得試行 → 環境変数フォールバック
  const { data } = await supabase
    .from("tenant_settings")
    .select("value")
    .eq("tenant_id", TENANT_ID)
    .eq("category", "line")
    .eq("key", "channel_access_token")
    .maybeSingle();
  
  if (data?.value) {
    // 暗号化されている可能性があるのでenv変数を優先
  }
  return process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || "";
}

(async () => {
  const today = new Date().toISOString().split("T")[0];
  
  // 予約取得
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("patient_id, patient_name, reserved_time")
    .eq("reserved_date", today)
    .not("status", "in", '("canceled","NG","no_show")')
    .order("reserved_time");

  if (error) { console.error("Error:", error.message); process.exit(1); }
  console.log(`予約件数: ${reservations.length}件`);

  // patients.patient_id で紐付け → line_id取得
  const pids = [...new Set(reservations.map(r => r.patient_id).filter(Boolean))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, patient_id, name, line_id")
    .in("patient_id", pids);

  const pidMap = {};
  for (const p of (patients || [])) pidMap[p.patient_id] = p;

  const lineIds = [];
  const patientInfoForLog = []; // message_log用
  for (const r of reservations) {
    const p = pidMap[r.patient_id];
    if (p?.line_id) {
      lineIds.push(p.line_id);
      patientInfoForLog.push({ patient_id: p.id, line_id: p.line_id, name: r.patient_name });
    }
  }

  // 重複除去
  const uniqueLineIds = [...new Set(lineIds)];
  console.log(`送信対象LINE ID: ${uniqueLineIds.length}件（重複除去後）`);

  if (uniqueLineIds.length === 0) {
    console.log("送信対象なし");
    return;
  }

  // LINE Multicast送信
  const token = await getToken();
  if (!token) {
    console.error("LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN が未設定");
    process.exit(1);
  }

  const messages = [{ type: "text", text: MESSAGE_TEXT }];
  
  const res = await fetch("https://api.line.me/v2/bot/message/multicast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: uniqueLineIds, messages }),
  });

  if (res.ok) {
    console.log(`✓ LINE送信成功（${uniqueLineIds.length}名）`);
  } else {
    const text = await res.text();
    console.error(`✗ LINE送信失敗 ${res.status}:`, text);
    process.exit(1);
  }

  // message_log にINSERT（送信履歴記録）
  const uniquePatients = [];
  const seen = new Set();
  for (const p of patientInfoForLog) {
    if (!seen.has(p.line_id)) {
      seen.add(p.line_id);
      uniquePatients.push(p);
    }
  }

  const logRows = uniquePatients.map(p => ({
    patient_id: String(p.patient_id),
    line_uid: p.line_id,
    message_type: "individual",
    content: MESSAGE_TEXT,
    status: "sent",
    direction: "outgoing",
    tenant_id: TENANT_ID,
  }));

  const { error: logError } = await supabase.from("message_log").insert(logRows);
  if (logError) {
    console.error("message_log記録失敗:", logError.message);
  } else {
    console.log(`✓ message_log記録完了（${logRows.length}件）`);
  }
})();
