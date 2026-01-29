// check-patient-20251200729.mjs
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const patientId = "20251200729";

console.log(`=== Patient ID: ${patientId} の再処方申請確認 ===\n`);

// 1. reorders テーブル確認
const { data: reorders, error: reorderError } = await supabase
  .from("reorders")
  .select("*")
  .eq("patient_id", patientId)
  .order("created_at", { ascending: false });

console.log("【reorders テーブル】");
if (reorderError) {
  console.log("❌ エラー:", reorderError.message);
} else if (!reorders || reorders.length === 0) {
  console.log("❌ データなし");
} else {
  console.log("✓ データあり:", reorders.length, "件\n");
  reorders.forEach((r, i) => {
    console.log(`${i + 1}. reorder_id: ${r.reorder_id}`);
    console.log(`   作成日時: ${r.created_at}`);
    console.log(`   ステータス: ${r.status || "pending"}`);
    console.log(`   product_code: ${r.product_code || "なし"}`);
    console.log(`   approval_status: ${r.approval_status || "なし"}`);
    console.log();
  });
}

// 2. intake テーブル確認
const { data: intake } = await supabase
  .from("intake")
  .select("patient_name, reserve_id, reserved_date, status")
  .eq("patient_id", patientId)
  .limit(1);

console.log("【intake テーブル】");
if (intake && intake.length > 0) {
  console.log("✓ 患者名:", intake[0].patient_name);
  console.log("  予約ID:", intake[0].reserve_id || "なし");
  console.log("  予約日:", intake[0].reserved_date || "なし");
  console.log("  診察ステータス:", intake[0].status || "未診察");
} else {
  console.log("❌ データなし");
}

// 3. orders テーブル確認
const { data: orders } = await supabase
  .from("orders")
  .select("*")
  .eq("patient_id", patientId)
  .order("paid_at", { ascending: false });

console.log("\n【orders テーブル】");
if (orders && orders.length > 0) {
  console.log("✓ 注文履歴:", orders.length, "件");
  orders.slice(0, 3).forEach((o, i) => {
    console.log(`  ${i + 1}. ${o.product_name || "商品名なし"} - ¥${o.amount} (${o.payment_status})`);
    console.log(`     決済日: ${o.paid_at}`);
  });
} else {
  console.log("❌ データなし");
}

// 4. マイページキャッシュ確認
console.log("\n【キャッシュ状態】");
console.log("キャッシュキー: dashboard:" + patientId);
console.log("TTL: 30分（1800秒）");
console.log("\n再処方申請がマイページに表示されない原因候補:");
console.log("1. reordersテーブルにデータがない");
console.log("2. キャッシュが古い（作成から30分以内）");
console.log("3. マイページAPIのクエリに問題がある");
