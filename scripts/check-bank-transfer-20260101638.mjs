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

const patientId = '20260101638';

console.log(`=== 患者ID: ${patientId} の銀行振込データ ===\n`);

// bank_transfer_ordersテーブルから取得
const { data, error } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .eq('patient_id', patientId)
  .order('created_at', { ascending: false });

if (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log('❌ データなし\n');
} else {
  console.log(`✅ ${data.length}件のデータあり\n`);
  data.forEach((order, index) => {
    console.log(`--- [${index + 1}] ID: ${order.id} ---`);
    console.log(`商品コード: ${order.product_code}`);
    console.log(`氏名: ${order.account_name}`);
    console.log(`電話番号: ${order.phone_number}`);
    console.log(`メール: ${order.email}`);
    console.log(`郵便番号: ${order.postal_code}`);
    console.log(`住所: ${order.address}`);
    console.log(`ステータス: ${order.status}`);
    console.log(`モード: ${order.mode || '(なし)'}`);
    console.log(`再処方ID: ${order.reorder_id || '(なし)'}`);
    console.log(`作成日時: ${order.created_at}`);
    console.log(`提出日時: ${order.submitted_at || '(なし)'}`);
    console.log(`確認日時: ${order.confirmed_at || '(なし)'}`);
    console.log('');
  });
}

// ordersテーブルも確認
const { data: ordersData, error: ordersError } = await supabase
  .from('orders')
  .select('*')
  .eq('patient_id', patientId)
  .order('paid_at', { ascending: false });

if (ordersError) {
  console.error('❌ ordersテーブルエラー:', ordersError.message);
} else if (!ordersData || ordersData.length === 0) {
  console.log('ordersテーブル: データなし\n');
} else {
  console.log(`\nordersテーブル: ${ordersData.length}件\n`);
  ordersData.forEach((order, index) => {
    console.log(`--- [${index + 1}] ID: ${order.id} ---`);
    console.log(`商品: ${order.product_name}`);
    console.log(`金額: ${order.amount}`);
    console.log(`決済日時: ${order.paid_at}`);
    console.log(`決済方法: ${order.payment_method || 'credit_card'}`);
    console.log(`配送ステータス: ${order.shipping_status}`);
    console.log(`追跡番号: ${order.tracking_number || '(なし)'}`);
    console.log('');
  });
}
