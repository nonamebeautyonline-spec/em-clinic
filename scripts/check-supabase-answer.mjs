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

console.log('=== Supabase answerテーブル構造確認 ===\n');

// 1. テーブルから1件取得して列名を確認（answersテーブル）
const { data: sample, error: sampleError } = await supabase
  .from('answers')
  .select('*')
  .limit(1);

if (sampleError) {
  console.error('❌ エラー:', sampleError.message);
  process.exit(1);
}

if (sample && sample.length > 0) {
  console.log('✅ answerテーブルの列名:');
  const columns = Object.keys(sample[0]);
  columns.forEach((col, idx) => {
    const value = sample[0][col];
    const valueStr = value !== null && value !== undefined ? String(value).substring(0, 50) : 'null';
    console.log(`  ${idx + 1}. ${col} = ${valueStr}`);
  });
  console.log('');
}

// 2. スクリーンショットから見える患者IDで検索
const testPatientIds = [
  '20260101497',
  '20260101527',
  '20260101089',
  '20260100482',
  '20251200394',
];

console.log('=== テスト患者IDで氏名検索 ===\n');

for (const pid of testPatientIds) {
  const { data, error } = await supabase
    .from('answers')
    .select('*')
    .eq('patient_id', pid)
    .limit(1);

  if (error) {
    console.log(`${pid}: ❌ エラー - ${error.message}`);
  } else if (data && data.length > 0) {
    // 氏名と思われる列を探す
    const row = data[0];
    const nameColumns = ['q1', '氏名', 'name', 'full_name'];
    let name = null;

    for (const col of nameColumns) {
      if (row[col]) {
        name = row[col];
        console.log(`${pid}: ✅ ${col} = ${name}`);
        break;
      }
    }

    if (!name) {
      console.log(`${pid}: ⚠️  見つかったが氏名列が不明`);
      console.log(`  利用可能な列: ${Object.keys(row).join(', ')}`);
    }
  } else {
    console.log(`${pid}: ⚠️  データが見つかりません`);
  }
}

console.log('\n=== 推奨設定 ===');
console.log('GASのgetPatientNameFromSupabase_関数で使用する列名を確認してください。');
