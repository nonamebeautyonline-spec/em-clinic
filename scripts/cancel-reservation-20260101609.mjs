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

console.log(`=== 患者 ${patientId} の予約をキャンセル ===\n`);

// reservationsテーブルの予約をcanceledに変更
const { data, error } = await supabase
  .from('reservations')
  .update({ status: 'canceled' })
  .eq('patient_id', patientId)
  .select();

if (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

console.log('✅ キャンセル完了');
console.log(JSON.stringify(data, null, 2));

// intakeテーブルの予約情報もクリア
console.log('\n=== intakeテーブルの予約情報クリア ===\n');

const { data: intakeData, error: intakeError } = await supabase
  .from('intake')
  .update({
    reserve_id: null,
    reserved_date: null,
    reserved_time: null
  })
  .eq('patient_id', patientId)
  .select();

if (intakeError) {
  console.error('❌ エラー:', intakeError.message);
  process.exit(1);
}

console.log('✅ intakeクリア完了');
console.log(JSON.stringify(intakeData, null, 2));

// キャッシュ無効化
console.log('\n=== キャッシュ無効化 ===\n');

const adminToken = envVars.ADMIN_TOKEN;
const response = await fetch('http://localhost:3000/api/admin/invalidate-cache', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  },
  body: JSON.stringify({ patient_id: patientId }),
});

const text = await response.text();
console.log(`ステータス: ${response.status}`);
console.log(`レスポンス: ${text}`);

console.log('\n✅ 完了');
