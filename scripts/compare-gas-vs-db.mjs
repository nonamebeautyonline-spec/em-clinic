// GASが返すpatient情報とSupabase intakeテーブルの比較スクリプト
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GAS_URL = process.env.GAS_MYPAGE_URL;

// テスト用のPID（既知の患者数名で比較）
const TEST_PIDS = process.argv.slice(2);

if (TEST_PIDS.length === 0) {
  // 引数なしの場合、intakeから適当に5人取得
  const { data } = await supabase
    .from("intake")
    .select("patient_id, patient_name")
    .not("patient_name", "is", null)
    .not("patient_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (data) {
    for (const row of data) {
      TEST_PIDS.push(row.patient_id);
    }
  }
}

console.log(`=== GAS vs DB 比較 (${TEST_PIDS.length}人) ===\n`);

for (const pid of TEST_PIDS) {
  console.log(`--- PID: ${pid} ---`);

  // 1. GAS getDashboard (light=1)
  let gasPatient = null;
  let gasHasIntake = null;
  let gasIntakeId = null;
  try {
    const url = `${GAS_URL}?type=getDashboard&patient_id=${encodeURIComponent(pid)}&light=1`;
    const res = await fetch(url, { method: "GET" });
    const json = await res.json();
    gasPatient = json.patient || null;
    gasHasIntake = json.hasIntake;
    gasIntakeId = json.intakeId;
    console.log("  GAS patient:", JSON.stringify(gasPatient, null, 2));
    console.log("  GAS hasIntake:", gasHasIntake, " intakeId:", gasIntakeId);
  } catch (e) {
    console.log("  GAS error:", e.message);
  }

  // 2. Supabase intake
  const { data: intakeRows } = await supabase
    .from("intake")
    .select("patient_id, patient_name, line_id, reserve_id, status, created_at")
    .eq("patient_id", pid)
    .order("created_at", { ascending: false });

  if (intakeRows && intakeRows.length > 0) {
    const latest = intakeRows[0];
    console.log("  DB patient_name:", latest.patient_name);
    console.log("  DB line_id:", latest.line_id);
    console.log("  DB rows:", intakeRows.length);
    console.log("  DB hasIntake: true");

    // 比較
    if (gasPatient) {
      const nameMatch = (gasPatient.displayName || "") === (latest.patient_name || "");
      const lineMatch = (gasPatient.line_user_id || "") === (latest.line_id || "");
      const idMatch = (gasPatient.id || "") === (latest.patient_id || "");
      console.log(`  [比較] id: ${idMatch ? "OK" : "MISMATCH"}`);
      console.log(`  [比較] displayName: ${nameMatch ? "OK" : "MISMATCH"} (GAS="${gasPatient.displayName}" vs DB="${latest.patient_name}")`);
      console.log(`  [比較] line_user_id: ${lineMatch ? "OK" : "MISMATCH"} (GAS="${gasPatient.line_user_id || ""}" vs DB="${latest.line_id || ""}")`);
    }
  } else {
    console.log("  DB: intake行なし");
  }

  console.log("");
}
