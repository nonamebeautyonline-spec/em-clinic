import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

console.log('=== 銀行振込の未照合注文を確認 ===\n');

// pending_confirmationの銀行振込を取得
const { data: pendingOrders, error: pendingError } = await supabase
  .from('orders')
  .select('*')
  .eq('payment_method', 'bank_transfer')
  .eq('status', 'pending_confirmation')
  .order('created_at', { ascending: false });

console.log(`■ pending_confirmation: ${pendingOrders?.length || 0}件\n`);

if (pendingOrders && pendingOrders.length > 0) {
  for (const order of pendingOrders) {
    console.log(`ID: ${order.id}`);
    console.log(`  患者ID: ${order.patient_id}`);
    console.log(`  商品コード: ${order.product_code}`);
    console.log(`  金額: ¥${order.amount}`);
    console.log(`  ステータス: ${order.status}`);
    console.log(`  作成日: ${order.created_at}`);
    console.log(`  決済日: ${order.paid_at || '(null)'}`);
    console.log(`  振込名義人: ${order.account_name || '(null)'}`);
    console.log(`  配送先氏名: ${order.shipping_name || '(null)'}`);
    console.log('');
  }
} else {
  console.log('未照合の銀行振込注文はありません');
}

if (pendingError) {
  console.error('エラー:', pendingError);
}

// 照合済みの銀行振込も確認
const { data: confirmedOrders, error: confirmedError } = await supabase
  .from('orders')
  .select('*')
  .eq('payment_method', 'bank_transfer')
  .eq('status', 'confirmed')
  .order('paid_at', { ascending: false })
  .limit(10);

console.log(`\n■ confirmed（最新10件）: ${confirmedOrders?.length || 0}件\n`);

if (confirmedOrders && confirmedOrders.length > 0) {
  for (const order of confirmedOrders) {
    console.log(`ID: ${order.id}`);
    console.log(`  患者ID: ${order.patient_id}`);
    console.log(`  金額: ¥${order.amount}`);
    console.log(`  決済日: ${order.paid_at || '(null)'}`);
    console.log('');
  }
}

if (confirmedError) {
  console.error('エラー:', confirmedError);
}
