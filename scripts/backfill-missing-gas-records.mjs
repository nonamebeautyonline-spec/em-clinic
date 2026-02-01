// 不足しているGASレコードをバックフィル
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const gasUrl = envVars.GAS_BANK_TRANSFER_URL;

if (!gasUrl) {
  console.error("❌ GAS_BANK_TRANSFER_URL が設定されていません");
  process.exit(1);
}

console.log("=== GASレコード バックフィル ===\n");

// 不足しているIDを指定
const missingIds = [18, 21];

console.log(`📋 バックフィル対象: ID ${missingIds.join(", ")}\n`);

for (const id of missingIds) {
  console.log(`\n処理中: ID ${id}...`);

  // Supabaseから取得
  const { data: order, error } = await supabase
    .from("bank_transfer_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !order) {
    console.error(`❌ ID ${id}: Supabaseから取得失敗`, error);
    continue;
  }

  console.log(`  patient_id: ${order.patient_id}`);
  console.log(`  product_code: ${order.product_code}`);
  console.log(`  mode: ${order.mode || "(なし)"}`);
  console.log(`  reorder_id: ${order.reorder_id || "(なし)"}`);

  // GASに送信
  const gasPayload = {
    type: "bank_transfer_order",
    order_id: String(order.id),
    patient_id: order.patient_id,
    product_code: order.product_code,
    mode: order.mode || "first",
    reorder_id: order.reorder_id || null,
    account_name: order.account_name,
    phone_number: order.phone_number,
    email: order.email,
    postal_code: order.postal_code,
    address: order.address,
    submitted_at: order.submitted_at,
  };

  try {
    const gasResponse = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gasPayload),
    });

    const gasResponseText = await gasResponse.text();
    console.log(`  GAS response status: ${gasResponse.status}`);
    console.log(`  GAS response: ${gasResponseText}`);

    if (gasResponse.ok) {
      console.log(`  ✅ ID ${id}: GASに記録成功`);
    } else {
      console.error(`  ❌ ID ${id}: GASへの記録失敗`);
    }
  } catch (e) {
    console.error(`  ❌ ID ${id}: GAS呼び出しエラー:`, e.message);
  }

  // レート制限を避けるため少し待機
  await new Promise(r => setTimeout(r, 500));
}

console.log("\n=== バックフィル完了 ===");
console.log("\n📝 次のステップ:");
console.log("  1. GASスプレッドシート「2026-01 住所情報」を開く");
console.log("  2. 以下のpatient_idが追加されているか確認:");
console.log("     - 20260100903 (マツモトミハネ)");
console.log("     - 20260101615 (タマダノア)");
