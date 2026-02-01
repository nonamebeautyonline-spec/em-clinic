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

console.log('=== bt_pending_ で始まるIDを確認 ===\n');

const { data: btPendingOrders, error } = await supabase
  .from('orders')
  .select('*')
  .like('id', 'bt_pending_%')
  .order('created_at', { ascending: false })
  .limit(10);

console.log(`bt_pending_: ${btPendingOrders?.length || 0}件\n`);

if (btPendingOrders && btPendingOrders.length > 0) {
  for (const order of btPendingOrders) {
    console.log(`ID: ${order.id}`);
    console.log(`  患者ID: ${order.patient_id}`);
    console.log(`  ステータス: ${order.status}`);
    console.log(`  決済方法: ${order.payment_method}`);
    console.log(`  金額: ¥${order.amount}`);
    console.log(`  作成日: ${order.created_at}`);
    console.log(`  決済日: ${order.paid_at || '(null)'}`);
    console.log('');
  }
}

if (error) {
  console.error('エラー:', error);
}

// 最近の全ordersも確認
console.log('=== 最近作成されたorders（全決済方法、最新10件） ===\n');

const { data: recentOrders, error: recentError } = await supabase
  .from('orders')
  .select('id, patient_id, payment_method, status, amount, created_at, paid_at')
  .order('created_at', { ascending: false })
  .limit(10);

if (recentOrders && recentOrders.length > 0) {
  for (const order of recentOrders) {
    console.log(`ID: ${order.id}`);
    console.log(`  患者ID: ${order.patient_id}`);
    console.log(`  決済方法: ${order.payment_method}`);
    console.log(`  ステータス: ${order.status}`);
    console.log(`  金額: ¥${order.amount}`);
    console.log(`  作成日: ${order.created_at}`);
    console.log(`  決済日: ${order.paid_at || '(null)'}`);
    console.log('');
  }
}

if (recentError) {
  console.error('エラー:', recentError);
}
