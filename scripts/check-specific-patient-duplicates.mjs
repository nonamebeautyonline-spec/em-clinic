#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim();
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

const patientId = process.argv[2] || '20251200404';

console.log(`=== 患者ID ${patientId} のデータ確認 ===\n`);

// bank_transfer_ordersテーブル
console.log('【bank_transfer_orders テーブル】');
const { data: btData, error: btError } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .eq('patient_id', patientId)
  .order('created_at', { ascending: true });

if (btError) {
  console.error('❌ エラー:', btError.message);
} else {
  console.log(`件数: ${btData.length}件\n`);
  btData.forEach((row, idx) => {
    console.log(`${idx + 1}. ID=${row.id}`);
    console.log(`   作成日時: ${row.created_at}`);
    console.log(`   確定日時: ${row.confirmed_at}`);
    console.log(`   商品コード: ${row.product_code}`);
    console.log(`   口座名義: ${row.account_name}`);
    console.log(`   住所: ${row.address}`);
    console.log();
  });
}

// ordersテーブル
console.log('【orders テーブル】');
const { data: ordersData, error: ordersError } = await supabase
  .from('orders')
  .select('*')
  .eq('patient_id', patientId)
  .order('paid_at', { ascending: true });

// bank_9 というIDも確認
console.log('\n【bank_9 という注文IDの確認】');
const { data: bank9Data, error: bank9Error } = await supabase
  .from('orders')
  .select('*')
  .eq('id', 'bank_9');

if (bank9Error) {
  console.error('❌ エラー:', bank9Error.message);
} else {
  console.log(`件数: ${bank9Data.length}件`);
  if (bank9Data.length > 0) {
    bank9Data.forEach(row => {
      console.log(`ID=${row.id}, 患者ID=${row.patient_id}, 決済日時=${row.paid_at}, 決済方法=${row.payment_method}`);
    });
  }
}

if (ordersError) {
  console.error('❌ エラー:', ordersError.message);
} else {
  console.log(`件数: ${ordersData.length}件\n`);
  ordersData.forEach((row, idx) => {
    console.log(`${idx + 1}. ID=${row.id}`);
    console.log(`   決済日時: ${row.paid_at}`);
    console.log(`   決済方法: ${row.payment_method}`);
    console.log(`   商品コード: ${row.product_code}`);
    console.log(`   商品名: ${row.product_name}`);
    console.log(`   金額: ${row.amount}`);
    console.log(`   配送ステータス: ${row.shipping_status}`);
    console.log(`   追跡番号: ${row.tracking_number || '(なし)'}`);
    console.log();
  });
}

// 銀行振込の重複チェック
const bankTransferOrders = ordersData.filter(o => o.payment_method === 'bank_transfer');
if (bankTransferOrders.length > 1) {
  console.log(`⚠️ 銀行振込の注文が ${bankTransferOrders.length} 件あります（重複の可能性）`);
  console.log('\n削除推奨: 最新の1件を残し、古い注文を削除してください。');
}
