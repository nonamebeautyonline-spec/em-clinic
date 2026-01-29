// debug-reorders.mjs
// GASのデバッグエンドポイントを呼び出してシートの実データを確認

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;
const PATIENT_ID = process.argv[2] || "20251200128";

if (!GAS_REORDER_URL) {
  console.error("❌ Missing GAS_REORDER_URL");
  process.exit(1);
}

console.log(`=== Calling GAS Debug Endpoint ===`);
console.log(`Patient ID: ${PATIENT_ID}`);
console.log(`GAS URL: ${GAS_REORDER_URL}`);

try {
  const response = await fetch(GAS_REORDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "debug", patient_id: PATIENT_ID }),
  });

  const data = await response.json();

  console.log(`\n✓ Status: ${response.status}`);

  if (data.ok) {
    console.log(`✓ Patient ID: ${data.patient_id}`);
    console.log(`✓ Count: ${data.count}`);

    if (data.reorders && data.reorders.length > 0) {
      console.log(`\n=== Sheet Data (直接読み取り) ===`);
      data.reorders.forEach((r) => {
        console.log(
          `Row ${r.row}: status=${r.status}, code=${r.product_code}, ts=${r.timestamp}`
        );
      });

      const pending = data.reorders.filter((r) => r.status === "pending");
      const confirmed = data.reorders.filter((r) => r.status === "confirmed");
      const canceled = data.reorders.filter((r) => r.status === "canceled");
      const paid = data.reorders.filter((r) => r.status === "paid");

      console.log(`\n=== Status Breakdown ===`);
      console.log(`  - pending: ${pending.length}`);
      console.log(`  - confirmed: ${confirmed.length}`);
      console.log(`  - canceled: ${canceled.length}`);
      console.log(`  - paid: ${paid.length}`);
    } else {
      console.log(`\n✗ No reorders found!`);
    }
  } else {
    console.log(`\n✗ API error:`, data);
  }
} catch (error) {
  console.error(`\n❌ Request failed:`, error.message);
}
