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

const patientId = '20260101609';

console.log(`=== 患者ID: ${patientId} の予約情報 ===\n`);

// reservationsテーブルから予約情報を取得
const { data: reservations, error: reservationsError } = await supabase
  .from('reservations')
  .select('*')
  .eq('patient_id', patientId)
  .order('created_at', { ascending: false });

if (reservationsError) {
  console.error('❌ reservationsテーブルエラー:', reservationsError.message);
} else if (!reservations || reservations.length === 0) {
  console.log('reservationsテーブル: データなし');
} else {
  console.log(`reservationsテーブル: ${reservations.length}件\n`);
  reservations.forEach((r, i) => {
    console.log(`--- [${i + 1}] ---`);
    console.log(`ID: ${r.id}`);
    console.log(`予約日時: ${r.reservation_datetime}`);
    console.log(`ステータス: ${r.status}`);
    console.log(`作成日時: ${r.created_at}`);
    console.log('');
  });
}

// intakeテーブルから問診情報を取得
const { data: intake, error: intakeError } = await supabase
  .from('intake')
  .select('*')
  .eq('patient_id', patientId);

if (intakeError) {
  console.error('❌ intakeテーブルエラー:', intakeError.message);
} else if (!intake || intake.length === 0) {
  console.log('intakeテーブル: データなし');
} else {
  console.log(`\nintakeテーブル: ${intake.length}件\n`);
  intake.forEach((i, idx) => {
    console.log(`--- [${idx + 1}] ---`);
    console.log(`ID: ${i.id}`);
    console.log(`氏名: ${i.name || '(なし)'}`);
    console.log(`ステータス: ${i.status || '(なし)'}`);
    console.log(`reserve_id: ${i.reserve_id || '(なし)'}`);
    console.log(`作成日時: ${i.created_at}`);
    console.log('');
  });
}

// ordersテーブルから注文情報を取得
const { data: orders, error: ordersError } = await supabase
  .from('orders')
  .select('*')
  .eq('patient_id', patientId)
  .order('paid_at', { ascending: false });

if (ordersError) {
  console.error('❌ ordersテーブルエラー:', ordersError.message);
} else if (!orders || orders.length === 0) {
  console.log('ordersテーブル: データなし');
} else {
  console.log(`\nordersテーブル: ${orders.length}件\n`);
  orders.forEach((o, idx) => {
    console.log(`--- [${idx + 1}] ---`);
    console.log(`ID: ${o.id}`);
    console.log(`商品: ${o.product_name}`);
    console.log(`金額: ${o.amount}`);
    console.log(`決済日時: ${o.paid_at}`);
    console.log(`配送ステータス: ${o.shipping_status}`);
    console.log(`決済方法: ${o.payment_method || 'credit_card'}`);
    console.log('');
  });
}

// bank_transfer_ordersテーブルから銀行振込注文を取得
const { data: bankOrders, error: bankError } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .eq('patient_id', patientId)
  .order('created_at', { ascending: false });

if (bankError) {
  console.error('❌ bank_transfer_ordersテーブルエラー:', bankError.message);
} else if (!bankOrders || bankOrders.length === 0) {
  console.log('bank_transfer_ordersテーブル: データなし');
} else {
  console.log(`\nbank_transfer_ordersテーブル: ${bankOrders.length}件\n`);
  bankOrders.forEach((o, idx) => {
    console.log(`--- [${idx + 1}] ---`);
    console.log(`ID: ${o.id}`);
    console.log(`商品コード: ${o.product_code}`);
    console.log(`氏名: ${o.account_name}`);
    console.log(`住所: ${o.address}`);
    console.log(`ステータス: ${o.status}`);
    console.log(`モード: ${o.mode || '(なし)'}`);
    console.log(`作成日時: ${o.created_at}`);
    console.log('');
  });
}
