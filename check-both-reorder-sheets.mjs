const GAS_REORDER_URL = process.env.GAS_REORDER_URL;
const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;

console.log("=== Checking REORDER_SHEET_ID in both GAS ===\n");

// 1. 再処方GASから最新データを取得
console.log("【再処方GAS】");
const reorderRes = await fetch(GAS_REORDER_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "listAll", include_all: true }),
});
const reorderData = await reorderRes.json();
const reorder321 = reorderData.reorders?.find(r => r.id === "321");
console.log("ID 321 status:", reorder321?.status);
console.log("GAS URL:", GAS_REORDER_URL);

// 2. intake GASから最新データを取得
console.log("\n【intake GAS (マイページ)】");
const mypageRes = await fetch(GAS_MYPAGE_URL + "?type=getDashboard&patient_id=20251200729&light=1");
const mypageData = await mypageRes.json();
const mypage321 = mypageData.reorders?.find(r => r.id === "321");
console.log("ID 321 status:", mypage321?.status);
console.log("GAS URL:", GAS_MYPAGE_URL);

console.log("\n=== 結論 ===");
if (reorder321?.status === mypage321?.status) {
  console.log("✅ 両方のGASが同じステータスを返しています");
} else {
  console.log("❌ 異なるステータスが返されています");
  console.log("   再処方GAS:", reorder321?.status);
  console.log("   intake GAS:", mypage321?.status);
  console.log("\n原因: 2つのGASが異なるGoogleシートを参照しています");
  console.log("解決策: intake GASのREORDER_SHEET_IDを、再処方GASと同じ値に設定してください");
}
