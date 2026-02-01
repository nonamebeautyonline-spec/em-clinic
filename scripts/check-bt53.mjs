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

console.log('=== bt_53 の確認 ===\n');

const { data: bt53, error: bt53Error } = await supabase
  .from('orders')
  .select('*')
  .eq('id', 'bt_53');

if (bt53 && bt53.length > 0) {
  console.log('ordersテーブルに bt_53 が存在します:');
  console.log(`  患者ID: ${bt53[0].patient_id}`);
  console.log(`  ステータス: ${bt53[0].status}`);
  console.log(`  決済方法: ${bt53[0].payment_method}`);
  console.log(`  金額: ¥${bt53[0].amount}`);
  console.log(`  作成日: ${bt53[0].created_at}`);
  console.log(`  決済日: ${bt53[0].paid_at || '(null)'}`);
} else {
  console.log('ordersテーブルに bt_53 は存在しません');
}

if (bt53Error) {
  console.error('エラー:', bt53Error);
}

// 患者IDで検索
console.log('\n=== 患者ID 20260101083 で orders を検索 ===\n');

const { data: ordersByPatient, error: patientError } = await supabase
  .from('orders')
  .select('*')
  .eq('patient_id', '20260101083');

if (ordersByPatient && ordersByPatient.length > 0) {
  console.log(`${ordersByPatient.length}件見つかりました:`);
  for (const order of ordersByPatient) {
    console.log(`  ID: ${order.id}`);
    console.log(`  ステータス: ${order.status}`);
    console.log(`  決済方法: ${order.payment_method}`);
    console.log(`  作成日: ${order.created_at}`);
    console.log('');
  }
} else {
  console.log('患者ID 20260101083 の orders レコードは存在しません');
}

if (patientError) {
  console.error('エラー:', patientError);
}
