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

  // Check all logs for this patient on 2/5
  console.log("=== intake_status_logs (2/5) ===");
  const { data: logs } = await supabase
    .from("intake_status_logs")
    .select("*")
    .eq("patient_id", patientId)
    .gte("created_at", "2026-02-04T15:00:00+00:00")  // 2/5 00:00 JST
    .order("created_at", { ascending: true });

  if (logs && logs.length > 0) {
    logs.forEach(l => {
      const jst = new Date(new Date(l.created_at).getTime() + 9*60*60*1000);
      console.log(`[${jst.toISOString().slice(11,19)}] ${l.action || l.new_status || JSON.stringify(l)}`);
    });
  } else {
    console.log("(ログなし)");
  }

  // Check patient's current state
  console.log("\n=== 患者の現在の状態 ===");
  const { data: patient } = await supabase
    .from("patients")
    .select("id, name, intake_status, created_at, updated_at")
    .eq("id", patientId)
    .single();

  if (patient) {
    console.log(`名前: ${patient.name}`);
    console.log(`intake_status: ${patient.intake_status}`);
    console.log(`更新日時: ${new Date(new Date(patient.updated_at).getTime() + 9*60*60*1000).toISOString().slice(0,19)} JST`);
  }

  // Check ALL reservations for this patient
  console.log("\n=== この患者の全予約履歴 ===");
  const { data: allRes } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });

  if (allRes) {
    allRes.forEach(r => {
      const createdJST = new Date(new Date(r.created_at).getTime() + 9*60*60*1000);
      const updatedJST = new Date(new Date(r.updated_at).getTime() + 9*60*60*1000);
      console.log(`ID: ${r.id}`);
      console.log(`  予約: ${r.reserved_date} ${r.reserved_time}`);
      console.log(`  状態: ${r.status}`);
      console.log(`  作成: ${createdJST.toISOString().slice(0,19)} JST`);
      console.log(`  更新: ${updatedJST.toISOString().slice(0,19)} JST`);
    });
  }
}

main();
