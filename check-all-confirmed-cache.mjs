// check-all-confirmed-cache.mjs
// 全顧客のconfirmed再処方申請で、キャッシュ不整合がないかチェック

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;
const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;

console.log("=== 全顧客のconfirmed再処方申請キャッシュチェック ===\n");

// 1. 再処方GASから全confirmed申請を取得
console.log("1. 再処方GASから全confirmed申請を取得中...");
const reorderRes = await fetch(GAS_REORDER_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "listAll", include_all: true }),
});

const reorderData = await reorderRes.json();
const confirmedReorders = reorderData.reorders?.filter(r => r.status === "confirmed") || [];

console.log(`   ✓ confirmed申請: ${confirmedReorders.length}件\n`);

if (confirmedReorders.length === 0) {
  console.log("confirmed状態の再処方申請がありません。");
  process.exit(0);
}

// 2. 各患者のキャッシュ状態をチェック
console.log("2. 各患者のintake GASキャッシュをチェック中...\n");

const issues = [];

for (const reorder of confirmedReorders) {
  const patientId = reorder.patient_id;
  const reorderId = reorder.id;

  // intake GASから取得
  const mypageRes = await fetch(
    GAS_MYPAGE_URL + "?type=getDashboard&patient_id=" + encodeURIComponent(patientId) + "&light=1"
  );
  const mypageData = await mypageRes.json();

  const mypageReorder = mypageData.reorders?.find(r => r.id === reorderId);

  if (!mypageReorder) {
    console.log(`⚠️  Patient ${patientId} (ID ${reorderId}): intake GASに見つかりません`);
    continue;
  }

  if (mypageReorder.status !== "confirmed") {
    issues.push({
      patientId,
      reorderId,
      patientName: reorder.patient_name || "",
      expectedStatus: "confirmed",
      actualStatus: mypageReorder.status,
      productCode: reorder.product_code,
    });

    console.log(`❌ Patient ${patientId} (${reorder.patient_name})`);
    console.log(`   ID ${reorderId}: 期待=confirmed, 実際=${mypageReorder.status}`);
    console.log(`   商品: ${reorder.product_code}\n`);
  } else {
    console.log(`✓  Patient ${patientId} (${reorder.patient_name}): OK`);
  }
}

console.log("\n=== チェック完了 ===\n");

if (issues.length === 0) {
  console.log("🎉 問題なし！全てのconfirmed申請がキャッシュに正しく反映されています。");
} else {
  console.log(`❌ ${issues.length}件の不整合が見つかりました:\n`);

  issues.forEach((issue, i) => {
    console.log(`${i + 1}. Patient ID: ${issue.patientId} (${issue.patientName})`);
    console.log(`   Reorder ID: ${issue.reorderId}`);
    console.log(`   商品: ${issue.productCode}`);
    console.log(`   期待ステータス: ${issue.expectedStatus}`);
    console.log(`   実際のステータス: ${issue.actualStatus}`);
    console.log();
  });

  console.log("\n対処方法:");
  console.log("以下のスクリプトを実行して、これらの顧客のキャッシュを一括クリアしてください:");
  console.log("  node --env-file=.env.local clear-problematic-caches.mjs");

  // 問題のある患者IDリストをファイルに保存
  const fs = await import("fs");
  fs.writeFileSync(
    "problematic-patient-ids.json",
    JSON.stringify(issues.map(i => i.patientId), null, 2)
  );
  console.log("\n問題のある患者IDを problematic-patient-ids.json に保存しました。");
}
