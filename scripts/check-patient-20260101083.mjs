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

const patientId = '20260101083';

console.log(`=== 患者 ${patientId} のデータ確認 ===\n`);

// ordersテーブルを確認
const { data: orders, error: ordersError } = await supabase
  .from('orders')
  .select('*')
  .eq('patient_id', patientId)
  .order('created_at', { ascending: true });

console.log(`■ ordersテーブル: ${orders?.length || 0}件\n`);
if (orders && orders.length > 0) {
  for (const order of orders) {
    console.log(`ID: ${order.id}`);
    console.log(`  決済方法: ${order.payment_method}`);
    console.log(`  商品名: ${order.product_name}`);
    console.log(`  金額: ¥${order.amount}`);
    console.log(`  ステータス: ${order.status}`);
    console.log(`  決済日: ${order.payment_date || order.paid_at}`);
    console.log(`  作成日: ${order.created_at}`);
    console.log('');
  }
}

if (ordersError) {
  console.error('ordersエラー:', ordersError);
}

// bank_transfer_ordersテーブルを確認
const { data: bankTransfers, error: btError } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .eq('patient_id', patientId)
  .order('created_at', { ascending: true });

console.log(`■ bank_transfer_ordersテーブル: ${bankTransfers?.length || 0}件\n`);
if (bankTransfers && bankTransfers.length > 0) {
  for (const bt of bankTransfers) {
    console.log(`ID: ${bt.id}`);
    console.log(`  商品コード: ${bt.product_code}`);
    console.log(`  商品名: ${bt.product_name || '(null)'}`);
    console.log(`  金額: ¥${bt.amount || '(null)'}`);
    console.log(`  ステータス: ${bt.status}`);
    console.log(`  作成日: ${bt.created_at}`);
    console.log(`  更新日: ${bt.updated_at}`);
    console.log('');
  }
}

if (btError) {
  console.error('bank_transfer_ordersエラー:', btError);
}
