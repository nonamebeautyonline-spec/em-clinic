const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=["']?([^"'\n]*)["']?$/);
  if (match) {
    process.env[match[1]] = match[2].trim();
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const patientId = "20260200159";

  // Patient full data
  const { data: patient, error } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .single();

  if (error) {
    console.log("Error:", error.message);
    return;
  }

  console.log("=== 患者 20260200159 の全データ ===");
  console.log("ID:", patient.id);
  console.log("名前:", patient.name);
  console.log("intake_status:", patient.intake_status);
  console.log("doctor_status:", patient.doctor_status);
  console.log("reservation_status:", patient.reservation_status);
  console.log("updated_at:", new Date(new Date(patient.updated_at).getTime() + 9*60*60*1000).toISOString().slice(0,19), "JST");

  // Check reservation count API simulating what the frontend does
  console.log("\n=== 予約可能状態チェック ===");

  // Count active reservations (same logic as API)
  const { data: activeRes, error: countErr } = await supabase
    .from("reservations")
    .select("id")
    .eq("patient_id", patientId)
    .not("status", "eq", "canceled");

  if (countErr) {
    console.log("Count error:", countErr.message);
  } else {
    console.log("アクティブな予約数:", activeRes ? activeRes.length : 0);
    console.log("予約可能:", (activeRes ? activeRes.length : 0) === 0 ? "はい" : "いいえ");
  }
}

main();
