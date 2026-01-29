const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const MYPAGE_INVALIDATE_SECRET = process.env.MYPAGE_INVALIDATE_SECRET || "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "secret";
const VERCEL_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const PID = "20251200729";

console.log("=== 完全キャッシュクリア ===\n");

// 1. Vercel Redisキャッシュ削除
console.log("1. Vercel Redisキャッシュ削除...");
await fetch(`${VERCEL_URL}/api/admin/invalidate-cache`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${ADMIN_TOKEN}`,
  },
  body: JSON.stringify({ patient_id: PID }),
});
console.log("   ✓ 完了");

// 2. GAS CacheServiceキャッシュ削除
console.log("2. GAS CacheServiceキャッシュ削除...");
await fetch(GAS_MYPAGE_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "invalidate_cache",
    patient_id: PID,
    secret: MYPAGE_INVALIDATE_SECRET,
  }),
});
console.log("   ✓ 完了");

console.log("\n3秒待機...");
await new Promise(r => setTimeout(r, 3000));

// 3. 確認
console.log("\n3. getDashboard確認...");
const res = await fetch(GAS_MYPAGE_URL + "?type=getDashboard&patient_id=" + PID + "&light=1");
const data = await res.json();

const r321 = data.reorders?.find(r => r.id === "321");
console.log("\nID 321 ステータス:", r321?.status);

if (r321?.status === "confirmed") {
  console.log("\n✅ 成功！ステータスが confirmed になりました");
  console.log("マイページを再読み込みすると、決済ボタンが表示されます。");
} else {
  console.log("\n❌ まだ", r321?.status, "のままです");
  console.log("\n全reorders:");
  data.reorders?.forEach(r => console.log(`  - ID ${r.id}: ${r.status}`));
}
