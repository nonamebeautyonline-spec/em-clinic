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

console.log(`=== 患者ID: ${patientId} の詳細情報 ===\n`);

// reservationsテーブル
const { data: reservations, error: resError } = await supabase
  .from('reservations')
  .select('*')
  .eq('patient_id', patientId);

if (resError) {
  console.error('❌ reservationsエラー:', resError.message);
} else if (!reservations || reservations.length === 0) {
  console.log('予約: なし\n');
} else {
  console.log('=== 予約情報 ===');
  console.log(JSON.stringify(reservations, null, 2));
  console.log('');
}

// intakeテーブル
const { data: intake, error: intakeError } = await supabase
  .from('intake')
  .select('*')
  .eq('patient_id', patientId);

if (intakeError) {
  console.error('❌ intakeエラー:', intakeError.message);
} else if (!intake || intake.length === 0) {
  console.log('問診: なし\n');
} else {
  console.log('=== 問診情報 ===');
  console.log(JSON.stringify(intake, null, 2));
  console.log('');
}
