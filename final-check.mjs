const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const PID = "20251200729";

console.log("=== 最終確認 ===\n");

// getDashboard呼び出し
const res = await fetch(GAS_MYPAGE_URL + "?type=getDashboard&patient_id=" + PID + "&light=1");
const data = await res.json();

const r321 = data.reorders?.find(r => r.id === "321");

console.log("ID 321 ステータス:", r321?.status);
console.log("商品コード:", r321?.productCode);

if (r321?.status === "confirmed") {
  console.log("\n🎉 成功！ステータスが confirmed になりました！");
  console.log("\n次のステップ:");
  console.log("1. Vercel Redisキャッシュを削除");
  console.log("2. マイページを再読み込み");
  console.log("3. 「再処方を決済する」ボタンが表示されるはず");
} else if (r321?.status === "pending") {
  console.log("\n⚠️ まだ pending です");
  console.log("GASキャッシュの削除が反映されるまで数秒待ってください");
} else {
  console.log("\n❓ 予期しないステータス:", r321?.status);
}
