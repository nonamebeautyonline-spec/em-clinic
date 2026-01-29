const GAS_URL = process.env.GAS_INTAKE_LIST_URL;

const res = await fetch(GAS_URL);
const data = await res.json();
const rows = data.rows || data;

const patient = rows.find(r => String(r.patient_id) === "20260101586");

if (!patient) {
  console.log("GASに患者が見つかりません");
  process.exit(1);
}

console.log("GASシートのデータ:");
console.log("  patient_id:", patient.patient_id);
console.log("  patient_name:", patient.patient_name || patient.name);
console.log("  answerer_id:", patient.answerer_id || "(なし)");
console.log("  line_id:", patient.line_id || "(なし)");
