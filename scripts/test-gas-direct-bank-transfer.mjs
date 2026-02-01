#!/usr/bin/env node
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

const GAS_URL = envVars.GAS_BANK_TRANSFER_URL;

console.log('=== GAS直接テスト（銀行振込） ===\n');
console.log('GAS URL:', GAS_URL);
console.log('');

const testPayload = {
  type: "bank_transfer_order",
  order_id: "TEST_999",
  patient_id: "TEST_GAS_DIRECT_" + Date.now(),
  product_code: "MJL_5mg_1m",
  mode: "first",
  reorder_id: null,
  account_name: "テストジロウ",
  phone_number: "08099998888",
  email: "gas-test@example.com",
  postal_code: "456-7890",
  address: "大阪府大阪市北区梅田1-1-1",
  submitted_at: new Date().toISOString(),
};

console.log('送信ペイロード:');
console.log(JSON.stringify(testPayload, null, 2));
console.log('');
console.log('GASに送信中...\n');

const startTime = Date.now();

try {
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testPayload),
  });

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log('=== レスポンス ===');
  console.log(`ステータスコード: ${response.status}`);
  console.log(`レスポンス時間: ${duration}ms`);
  console.log('');

  const text = await response.text();
  console.log('レスポンスボディ（生テキスト）:');
  console.log(text);
  console.log('');

  if (text) {
    try {
      const json = JSON.parse(text);
      console.log('=== パース済みJSON ===');
      console.log(JSON.stringify(json, null, 2));
      console.log('');

      if (json.ok) {
        console.log('✅ 成功！');
        console.log(`   シート: ${json.sheet}`);
        console.log(`   行番号: ${json.row}`);
        console.log(`   年月: ${json.yearMonth}`);
        console.log(`   注文ID: ${json.orderId}`);
        console.log(`   患者ID: ${json.patientId}`);
      } else {
        console.log('❌ GASエラー');
        console.log(`   エラー: ${json.error}`);
        if (json.step) console.log(`   ステップ: ${json.step}`);
        if (json.errorStack) console.log(`   スタックトレース:\n${json.errorStack}`);
      }
    } catch (e) {
      console.log('❌ JSONパースエラー:', e.message);
    }
  } else {
    console.log('❌ レスポンスボディが空です');
  }

} catch (error) {
  const endTime = Date.now();
  const duration = endTime - startTime;
  console.error(`❌ エラー (${duration}ms):`);
  console.error('タイプ:', error.name);
  console.error('メッセージ:', error.message);
  if (error.cause) console.error('原因:', error.cause);
}
