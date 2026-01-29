// check-intake-sheet-for-patient.mjs
// 問診シートで該当patient_idのデータを確認

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;

if (!GAS_MYPAGE_URL) {
  console.error("❌ Missing GAS_MYPAGE_URL");
  process.exit(1);
}

const patientId = "20260101532";

console.log(`=== Checking intake sheet for patient_id: ${patientId} ===\n`);

try {
  const response = await fetch(`${GAS_MYPAGE_URL}?type=get_dashboard&patient_id=${patientId}`, {
    method: "GET",
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    console.error("❌ GAS error:", data);
    process.exit(1);
  }

  console.log("=== Response from GAS ===");
  console.log(JSON.stringify(data, null, 2));
} catch (err) {
  console.error("❌ Error:", err.message);
}
