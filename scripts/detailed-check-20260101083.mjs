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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const patientId = '20260101083';

console.log('=== 詳細確認: 患者 20260101083 ===\n');

// 1. ordersテーブル（全ステータス）
console.log('■ orders テーブル（全てのステータス）:');
const { data: allOrders, error: ordersError } = await supabase
  .from('orders')
  .select('*')
  .eq('patient_id', patientId);

if (allOrders && allOrders.length > 0) {
  console.log(`  ${allOrders.length}件見つかりました\n`);
  for (const order of allOrders) {
    console.log(`  ID: ${order.id}`);
    console.log(`    決済方法: ${order.payment_method}`);
    console.log(`    ステータス: ${order.status}`);
    console.log(`    商品コード: ${order.product_code}`);
    const amountStr = order.amount ? `¥${order.amount}` : '(null)';
    console.log(`    金額: ${amountStr}`);
    console.log(`    作成日: ${order.created_at}`);
    console.log(`    決済日: ${order.paid_at || '(null)'}`);
    console.log('');
  }
} else {
  console.log('  0件\n');
}

// 2. bank_transfer_orders テーブル
console.log('■ bank_transfer_orders テーブル:');
const { data: btOrders, error: btError } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .eq('patient_id', patientId);

if (btOrders && btOrders.length > 0) {
  console.log(`  ${btOrders.length}件見つかりました\n`);
  for (const bt of btOrders) {
    console.log(`  ID: ${bt.id}`);
    console.log(`    商品コード: ${bt.product_code}`);
    console.log(`    ステータス: ${bt.status}`);
    console.log(`    作成日: ${bt.created_at}`);
    console.log(`    更新日: ${bt.updated_at}`);
    console.log(`    振込名義人: ${bt.account_name || '(null)'}`);
    console.log('');
  }
} else {
  console.log('  0件\n');
}

// 3. bt_で始まる全IDを確認（この患者用かもしれない）
console.log('■ bt_で始まる全IDからこの患者を探す:');
const { data: allBtOrders } = await supabase
  .from('orders')
  .select('*')
  .like('id', 'bt_%')
  .eq('patient_id', patientId);

if (allBtOrders && allBtOrders.length > 0) {
  console.log(`  ${allBtOrders.length}件見つかりました\n`);
  for (const order of allBtOrders) {
    console.log(`  ID: ${order.id}`);
    console.log(`    ステータス: ${order.status}`);
    console.log(`    作成日: ${order.created_at}`);
    console.log('');
  }
} else {
  console.log('  0件\n');
}

// 4. 最近のorders（時系列で前後を確認）
console.log('■ 最近のorders（前後範囲）:');
const { data: recentOrders } = await supabase
  .from('orders')
  .select('id, patient_id, payment_method, status, created_at')
  .gte('created_at', '2026-02-01T12:00:00')
  .lte('created_at', '2026-02-01T13:00:00')
  .order('created_at', { ascending: true });

if (recentOrders && recentOrders.length > 0) {
  console.log(`  ${recentOrders.length}件見つかりました\n`);
  for (const order of recentOrders) {
    const pid = order.patient_id === patientId ? '★' : '  ';
    console.log(`${pid} ${order.created_at} - ${order.id} (${order.patient_id}) [${order.payment_method}]`);
  }
} else {
  console.log('  0件\n');
}

console.log('\n=== 完了 ===');
