// 不足している銀行振込データをGASにバックフィル
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

console.log("=== 不足データ バックフィル ===\n");

// 不足しているID: 28
const missingId = 28;

console.log(`処理対象: ID ${missingId}\n`);

// Supabaseから取得
const { data: order, error } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .eq("id", missingId)
  .single();

if (error || !order) {
  console.error(`❌ ID ${missingId}: Supabaseから取得失敗`, error);
  process.exit(1);
}

console.log("【データ確認】");
console.log(`  ID: ${order.id}`);
console.log(`  patient_id: ${order.patient_id}`);
console.log(`  product_code: ${order.product_code}`);
console.log(`  mode: ${order.mode || "(null)"}`);
console.log(`  reorder_id: ${order.reorder_id || "(null)"}`);
console.log(`  account_name: ${order.account_name}`);
console.log(`  phone_number: ${order.phone_number}`);
console.log(`  email: ${order.email}`);
console.log(`  postal_code: ${order.postal_code}`);
console.log(`  address: ${order.address}`);
console.log(`  status: ${order.status}`);
console.log(`  created_at: ${order.created_at}`);
console.log(`  confirmed_at: ${order.confirmed_at}`);
console.log();

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

console.log("【GASへ送信】");
console.log(JSON.stringify(gasPayload, null, 2));
console.log();

try {
  const gasResponse = await fetch(gasUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(gasPayload),
  });

  const gasResponseText = await gasResponse.text();
  console.log(`GAS response status: ${gasResponse.status}`);
  console.log(`GAS response: ${gasResponseText}`);

  if (gasResponse.ok) {
    console.log(`\n✅ ID ${missingId}: GASに記録成功`);
    console.log("\n📝 確認:");
    console.log("  GASスプレッドシート「2026-01 住所情報」を開いて、");
    console.log(`  patient_id: ${order.patient_id}（${order.account_name}）が追加されているか確認してください`);
  } else {
    console.error(`\n❌ ID ${missingId}: GASへの記録失敗`);
  }
} catch (e) {
  console.error(`\n❌ ID ${missingId}: GAS呼び出しエラー:`, e.message);
}

console.log("\n=== バックフィル完了 ===");
