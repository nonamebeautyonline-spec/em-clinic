// check-list-action.mjs
// 既存のlistアクションを使ってデータを確認

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;
const PATIENT_ID = process.argv[2] || "20251200128";

if (!GAS_REORDER_URL) {
  console.error("❌ Missing GAS_REORDER_URL");
  process.exit(1);
}

console.log(`=== Calling GAS List Action ===`);
console.log(`Patient ID: ${PATIENT_ID}`);

try {
  const response = await fetch(GAS_REORDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "list", patient_id: PATIENT_ID }),
  });

  const data = await response.json();

  console.log(`\n✓ Status: ${response.status}`);

  if (data.ok) {
    console.log(`✓ Reorders count: ${data.reorders.length}`);

    if (data.reorders && data.reorders.length > 0) {
      console.log(`\n=== List Action Response ===`);
      data.reorders.forEach((r, i) => {
        console.log(
          `[${i}] id=${r.id}, status=${r.status}, code=${r.product_code}, ts=${r.timestamp}`
        );
      });

      const pending = data.reorders.filter((r) => r.status === "pending");
      const confirmed = data.reorders.filter((r) => r.status === "confirmed");

      console.log(`\n=== Status Breakdown ===`);
      console.log(`  - pending: ${pending.length}`);
      console.log(`  - confirmed: ${confirmed.length}`);
    } else {
      console.log(`\n✗ No reorders found!`);
    }
  } else {
    console.log(`\n✗ API error:`, data);
  }
} catch (error) {
  console.error(`\n❌ Request failed:`, error.message);
}
