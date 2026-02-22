const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // 1. 同一patient_idで複数intakeを持つケース
  const { data: allIntake } = await sb.from("intake").select("patient_id");
  const groups = {};
  for (const r of allIntake) {
    if (!groups[r.patient_id]) groups[r.patient_id] = 0;
    groups[r.patient_id]++;
  }
  const multiIntake = Object.entries(groups).filter(([, c]) => c > 1);
  console.log("=== 同一patient_idで複数intake ===");
  console.log(`該当患者数: ${multiIntake.length}`);
  for (const [pid, count] of multiIntake.slice(0, 10)) {
    console.log(`  ${pid}: ${count}件`);
  }

  // 2. intakeにあるがpatientsにないpatient_id（孤児intake）
  const { data: allPatients } = await sb.from("patients").select("patient_id");
  const patientSet = new Set(allPatients.map(p => p.patient_id));
  const orphanIntake = Object.keys(groups).filter(pid => !patientSet.has(pid));
  console.log(`\n=== 孤児intake（patientsに存在しない） ===`);
  console.log(`該当: ${orphanIntake.length}件`);
  for (const pid of orphanIntake.slice(0, 10)) {
    console.log(`  ${pid} (intake ${groups[pid]}件)`);
  }

  // 差分の内訳
  const intakeCount = allIntake.length;
  const patientCount = allPatients.length;
  const extraFromMulti = multiIntake.reduce((sum, [, c]) => sum + c - 1, 0);
  console.log(`\n=== 差分内訳 ===`);
  console.log(`patients: ${patientCount}, intake: ${intakeCount}, 差: ${intakeCount - patientCount}`);
  console.log(`複数intakeによる増分: ${extraFromMulti}`);
  console.log(`孤児intakeによる増分: ${orphanIntake.length}`);
}
main().catch(console.error);
