// check-reorder-gas.mjs
// GASから直接再処方申請データを取得

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;
const patientId = "20251200729";

console.log(`=== Patient ID: ${patientId} の再処方申請確認（GAS） ===\n`);
console.log(`GAS_REORDER_URL: ${GAS_REORDER_URL}\n`);

try {
  // 1. 患者用リスト取得（status: pending/approved のみ）
  const response = await fetch(GAS_REORDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "list",
      patient_id: patientId,
    }),
  });

  if (!response.ok) {
    console.error("❌ GAS request failed:", response.status);
    process.exit(1);
  }

  const data = await response.json();

  console.log("【GAS response（action: list）】");
  console.log(JSON.stringify(data, null, 2));

  if (data.ok && data.reorders) {
    console.log(`\n✓ 再処方申請: ${data.reorders.length} 件`);
    if (data.reorders.length === 0) {
      console.log("\n⚠️ 再処方申請が見つかりません");
      console.log("\n可能性:");
      console.log("1. Googleシートに該当patient_idの行が存在しない");
      console.log("2. status が canceled/rejected/paid で除外されている");
      console.log("3. patient_idが正規化されていない（20251200729.0 など）");
    } else {
      console.log("\n再処方申請詳細:");
      data.reorders.forEach((r, i) => {
        console.log(`${i + 1}. ID: ${r.id}`);
        console.log(`   作成日時: ${r.timestamp}`);
        console.log(`   商品コード: ${r.product_code}`);
        console.log(`   ステータス: ${r.status}`);
        console.log(`   備考: ${r.note || "なし"}`);
        console.log();
      });
    }
  } else {
    console.log("\n❌ GASエラー:", data.error || "不明");
  }

  // 2. 全件取得（Doctor用、全statusを含む）を試す
  console.log("\n=== 全件確認（action: listAll）===");

  const allResponse = await fetch(GAS_REORDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "listAll",
      include_all: true,
    }),
  });

  if (allResponse.ok) {
    const allData = await allResponse.json();
    if (allData.ok && allData.reorders) {
      const patientReorders = allData.reorders.filter(r =>
        String(r.patient_id).trim() === patientId
      );

      console.log(`全statusの再処方申請: ${patientReorders.length} 件`);
      if (patientReorders.length > 0) {
        console.log("\n詳細:");
        patientReorders.forEach((r, i) => {
          console.log(`${i + 1}. ID: ${r.id}`);
          console.log(`   ステータス: ${r.status}`);
          console.log(`   商品コード: ${r.product_code}`);
          console.log(`   作成日時: ${r.timestamp}`);
          console.log();
        });
      }
    }
  }

} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}
