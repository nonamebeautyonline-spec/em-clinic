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

console.log('=== 銀行振込データの重複確認 ===\n');

// bank_transfer_ordersテーブルから全データ取得
const { data: allData, error: fetchError } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .order('patient_id', { ascending: true })
  .order('created_at', { ascending: false }); // 新しい順

if (fetchError) {
  console.error('❌ データ取得エラー:', fetchError.message);
  process.exit(1);
}

console.log(`全データ: ${allData.length}件\n`);

// 患者IDごとにグループ化
const byPatientId = new Map();

for (const row of allData) {
  const pid = row.patient_id;
  if (!pid) continue;

  // TESTデータはスキップ
  if (String(pid).startsWith('TEST')) continue;

  if (!byPatientId.has(pid)) {
    byPatientId.set(pid, []);
  }
  byPatientId.get(pid).push(row);
}

// 重複がある患者IDを抽出
const duplicates = [];
for (const [pid, rows] of byPatientId.entries()) {
  if (rows.length > 1) {
    duplicates.push({ pid, rows });
  }
}

console.log(`実患者データ: ${byPatientId.size}件`);
console.log(`重複あり: ${duplicates.length}件\n`);

if (duplicates.length === 0) {
  console.log('✅ 重複データはありません。');
  process.exit(0);
}

console.log('=== 重複データ詳細 ===\n');

for (const { pid, rows } of duplicates) {
  console.log(`患者ID: ${pid} (${rows.length}件)`);
  rows.forEach((row, idx) => {
    console.log(`  ${idx + 1}. ID=${row.id}, 作成日時=${row.created_at}, 口座名義=${row.account_name}`);
  });
  console.log();
}

// 削除対象を確認（最新の1件を残す）
const toDelete = [];
for (const { pid, rows } of duplicates) {
  // 最新の1件（rows[0]）を残し、それ以外を削除
  for (let i = 1; i < rows.length; i++) {
    toDelete.push(rows[i]);
  }
}

console.log(`\n削除対象: ${toDelete.length}件\n`);

if (toDelete.length === 0) {
  console.log('削除するデータはありません。');
  process.exit(0);
}

console.log('=== 削除実行 ===\n');

let deletedCount = 0;
let errorCount = 0;

for (const row of toDelete) {
  console.log(`削除: ID=${row.id}, 患者ID=${row.patient_id}, 作成日時=${row.created_at}`);

  // bank_transfer_ordersから削除
  const { error: deleteError } = await supabase
    .from('bank_transfer_orders')
    .delete()
    .eq('id', row.id);

  if (deleteError) {
    console.error(`  ❌ エラー: ${deleteError.message}`);
    errorCount++;
    continue;
  }

  // 対応するordersレコードも削除
  const paymentId = `bt_${row.id}`;
  const { error: orderDeleteError } = await supabase
    .from('orders')
    .delete()
    .eq('id', paymentId);

  if (orderDeleteError) {
    console.error(`  ⚠️ orders削除エラー (${paymentId}): ${orderDeleteError.message}`);
  }

  deletedCount++;
  console.log(`  ✅ 削除完了`);
}

console.log('\n=== 削除完了 ===');
console.log(`削除: ${deletedCount}件`);
console.log(`エラー: ${errorCount}件`);

if (errorCount > 0) {
  console.log('\n⚠️ 一部のデータでエラーが発生しました。');
}
