import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

const paymentId = "1wf4t5lV6uSPYvXbgmHtNB79ArBZY";

console.log("=== 返金フィールドを完全に設定 ===");
console.log(`Payment ID: ${paymentId}\n`);

// 1. 現在の状態を確認
console.log("【1. 更新前の状態】");
const { data: beforeOrder, error: beforeError } = await supabase
  .from("orders")
  .select("id, status, refund_status, refunded_at, refunded_amount, amount, patient_id")
  .eq("id", paymentId)
  .single();

if (beforeError) {
  console.error("エラー:", beforeError);
  process.exit(1);
}

console.log(`  status: ${beforeOrder.status}`);
console.log(`  refund_status: ${beforeOrder.refund_status || "(null)"}`);
console.log(`  refunded_at: ${beforeOrder.refunded_at || "(null)"}`);
console.log(`  refunded_amount: ${beforeOrder.refunded_amount || "(null)"}`);
console.log(`  amount: ${beforeOrder.amount}`);
console.log();

// 2. 返金フィールドを完全に設定
console.log("【2. 返金フィールドを設定中...】");
const now = new Date().toISOString();

const { data: updatedOrder, error: updateError } = await supabase
  .from("orders")
  .update({
    status: "refunded",
    refund_status: "COMPLETED",
    refunded_at: now,
    refunded_amount: beforeOrder.amount, // 全額返金
    updated_at: now,
  })
  .eq("id", paymentId)
  .select()
  .single();

if (updateError) {
  console.error("更新エラー:", updateError);
  process.exit(1);
}

console.log("✅ 更新成功");
console.log(`  status: ${updatedOrder.status}`);
console.log(`  refund_status: ${updatedOrder.refund_status}`);
console.log(`  refunded_at: ${updatedOrder.refunded_at}`);
console.log(`  refunded_amount: ${updatedOrder.refunded_amount}`);
console.log();

// 3. キャッシュ無効化
console.log("【3. キャッシュ無効化】");
const patientId = beforeOrder.patient_id;

console.log(`患者ID ${patientId} のキャッシュを無効化中...`);

try {
  const response = await fetch(`http://localhost:3000/api/admin/invalidate-cache`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${envVars.ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ patient_id: patientId }),
  });

  if (response.ok) {
    console.log("✅ キャッシュ無効化成功");
  } else {
    const errorText = await response.text();
    console.log(`⚠️ キャッシュ無効化失敗: ${response.status} ${errorText}`);
  }
} catch (err) {
  console.log(`⚠️ キャッシュ無効化エラー: ${err.message}`);
}

console.log();

// 4. 最終確認
console.log("【4. 最終確認】");
const { data: finalOrder, error: finalError } = await supabase
  .from("orders")
  .select("id, status, refund_status, refunded_at, refunded_amount")
  .eq("id", paymentId)
  .single();

if (finalError) {
  console.error("エラー:", finalError);
} else {
  console.log("返金処理が完全に反映されました:");
  console.log(`  status: ${finalOrder.status}`);
  console.log(`  refund_status: ${finalOrder.refund_status}`);
  console.log(`  refunded_at: ${finalOrder.refunded_at}`);
  console.log(`  refunded_amount: ¥${finalOrder.refunded_amount?.toLocaleString()}`);
}

console.log();
console.log("=== 完了 ===");
console.log("マイページで返金が正しく表示されるはずです。");
