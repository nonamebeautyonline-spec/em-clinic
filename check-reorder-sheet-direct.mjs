// check-reorder-sheet-direct.mjs
// 再処方シートから直接患者データを取得

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;
const patientIds = ["20251200404", "20251200841"];

console.log("=== 再処方シートから直接データ取得 ===\n");

try {
  const response = await fetch(GAS_REORDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "get_all_reorders",
    }),
  });

  const data = await response.json();

  if (!data.ok || !data.reorders) {
    console.log("❌ データ取得失敗:", data);
    process.exit(1);
  }

  console.log(`✓ 全再処方申請: ${data.reorders.length}件\n`);

  for (const patientId of patientIds) {
    console.log(`\n=== Patient ${patientId} の再処方申請 ===`);

    const patientReorders = data.reorders.filter(r => {
      const pid = String(r.patient_id || "").trim().replace(/\.0$/, "");
      return pid === patientId;
    });

    if (patientReorders.length === 0) {
      console.log("⚠️  再処方申請なし");
    } else {
      console.log(`✓ ${patientReorders.length}件の再処方申請:\n`);
      patientReorders.forEach(r => {
        console.log(`  Row ${r.id}:`);
        console.log(`    Timestamp: ${r.timestamp || "N/A"}`);
        console.log(`    Patient ID: ${r.patient_id}`);
        console.log(`    Product: ${r.product_code}`);
        console.log(`    Status: ${r.status}`);
        console.log(`    Note: ${r.note || "(なし)"}`);
        console.log("");
      });
    }
  }
} catch (err) {
  console.error("❌ エラー:", err.message);
}
