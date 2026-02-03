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

const pendingRefunds = [
  "Lftw4qOHyLvIztZ8BbMWGVdVjNXZY",
  "b5CQJeVn6agrVDnCchZvbz0ArbWZY"
];

console.log("=== PENDING返金をCOMPLETEDに更新 ===\n");

for (const paymentId of pendingRefunds) {
  console.log(`処理中: ${paymentId}`);

  // 現在の状態を確認
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (fetchError || !order) {
    console.log(`  ❌ 注文が見つかりません: ${fetchError?.message}`);
    continue;
  }

  console.log(`  現在の状態:`);
  console.log(`    status: ${order.status}`);
  console.log(`    refund_status: ${order.refund_status}`);
  console.log(`    refunded_amount: ${order.refunded_amount}`);

  // PENDING → COMPLETED に更新
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "refunded",
      refund_status: "COMPLETED",
      updated_at: now,
    })
    .eq("id", paymentId);

  if (updateError) {
    console.log(`  ❌ 更新エラー: ${updateError.message}`);
  } else {
    console.log(`  ✅ 更新成功: refund_status → COMPLETED, status → refunded`);
  }

  console.log();
}

console.log("=== 完了 ===");
