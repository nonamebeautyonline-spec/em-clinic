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

console.log('=== のなめマスターから bt_9 の追跡番号を取得 ===\n');

// GASにリクエストを送ってのなめマスターからデータ取得
const GAS_URL = envVars.GAS_UPSERT_URL?.replace('/exec', '/dev') || '';

if (!GAS_URL) {
  console.error('❌ GAS_UPSERT_URL が設定されていません');
  process.exit(1);
}

// のなめマスターシートから bt_9 のデータを取得するには、
// GASに新しいエンドポイントを追加するか、
// 直接 Google Sheets API を使う必要があります。

// ここでは、手動で追跡番号を入力してもらう方式にします。
console.log('のなめマスターシートで bt_9 の追跡番号を確認してください。');
console.log('https://docs.google.com/spreadsheets/d/...');
console.log();
console.log('追跡番号を入力してください（Enter で終了）: ');

// 簡易的に、追跡番号を引数から取得
const trackingNumber = process.argv[2];

if (!trackingNumber) {
  console.error('使用方法: node sync-bt9-tracking.mjs <追跡番号>');
  process.exit(1);
}

console.log(`追跡番号: ${trackingNumber}\n`);

// carrier判定
let carrier = null;
if (trackingNumber.match(/^\d{11,12}$/)) {
  carrier = "japanpost";
} else if (trackingNumber.match(/^\d{12}$/)) {
  carrier = "yamato";
}

console.log(`推定キャリア: ${carrier || '不明'}\n`);

// ordersテーブルを更新
const { data, error } = await supabase
  .from('orders')
  .update({
    tracking_number: trackingNumber,
    carrier: carrier,
    shipping_status: 'shipped',
  })
  .eq('id', 'bt_9')
  .select();

if (error) {
  console.error('❌ 更新エラー:', error.message);
  process.exit(1);
}

console.log('✅ 更新完了');
console.log(JSON.stringify(data, null, 2));
