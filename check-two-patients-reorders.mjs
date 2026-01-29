// check-two-patients-reorders.mjs
// 2人の患者の再処方申請を確認

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;
const patientIds = ["20251200404", "20251200841"];

console.log("=== 再処方シートから2人の患者データを確認 ===\n");

try {
  const response = await fetch(GAS_REORDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "listAll",
      include_all: true,
    }),
  });

  const data = await response.json();

  if (!data.ok || !data.reorders) {
    console.log("❌ データ取得失敗:", data);
    process.exit(1);
  }

  console.log(`✓ 全再処方申請: ${data.reorders.length}件\n`);

  for (const patientId of patientIds) {
    console.log(`${"=".repeat(60)}`);
    console.log(`Patient ${patientId}`);
    console.log("=".repeat(60) + "\n");

    const patientReorders = data.reorders.filter(r => {
      const pid = String(r.patient_id || "").trim().replace(/\.0$/, "");
      return pid === patientId;
    });

    if (patientReorders.length === 0) {
      console.log("⚠️  再処方申請なし\n");
    } else {
      console.log(`✓ ${patientReorders.length}件の再処方申請:\n`);

      // 最新順にソート（IDが大きい = 行番号が大きい = 新しい）
      patientReorders.sort((a, b) => Number(b.id) - Number(a.id));

      patientReorders.forEach((r, idx) => {
        console.log(`${idx + 1}. Row ${r.id} - ${r.timestamp}:`);
        console.log(`   Patient: ${r.patient_name || "名前なし"} (${r.patient_id})`);
        console.log(`   Product: ${r.product_code}`);
        console.log(`   Status: ${r.status}`);
        if (r.note) console.log(`   Note: ${r.note}`);
        console.log("");
      });
    }
  }
} catch (err) {
  console.error("❌ エラー:", err.message);
}
