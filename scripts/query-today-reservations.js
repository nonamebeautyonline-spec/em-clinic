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

(async () => {
  const today = new Date().toISOString().split("T")[0];
  
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, patient_name, reserved_date, reserved_time, status")
    .eq("reserved_date", today)
    .not("status", "in", '("canceled","NG","no_show")')
    .order("reserved_time");

  if (error) { console.error("Error:", error.message); process.exit(1); }

  // reservations.patient_id → patients.patient_id で紐付け
  const pids = [...new Set(reservations.map(r => r.patient_id).filter(Boolean))];
  
  const { data: patients } = await supabase
    .from("patients")
    .select("id, patient_id, name, line_id")
    .in("patient_id", pids);

  const pidMap = {};
  for (const p of (patients || [])) pidMap[p.patient_id] = p;

  console.log("=== 今日のアクティブ予約 ===\n");
  const sendable = [];
  const notSendable = [];

  for (const r of reservations) {
    const p = pidMap[r.patient_id] || {};
    const hasLine = !!p.line_id;
    if (hasLine) sendable.push({ ...r, line_id: p.line_id });
    else notSendable.push(r);
    console.log(`${r.reserved_time || "未定"} | ${r.patient_name || "名前なし"} | LINE: ${hasLine ? "✓" : "✗"}`);
  }
  
  console.log(`\n合計: ${reservations.length}件`);
  console.log(`LINE送信可能: ${sendable.length}件`);
  console.log(`LINE送信不可: ${notSendable.length}件`);
  
  if (sendable.length > 0) {
    console.log("\n--- LINE送信対象者 ---");
    for (const s of sendable) {
      console.log(`  ${s.patient_name} (${s.reserved_time})`);
    }
  }
  if (notSendable.length > 0) {
    console.log("\n--- LINE送信不可（line_idなし） ---");
    for (const s of notSendable) {
      console.log(`  ${s.patient_name} (${s.reserved_time})`);
    }
  }
})();
