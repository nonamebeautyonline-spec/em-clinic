// check-intake-headers.mjs
// 問診シートのヘッダーを確認

import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const GAS_INTAKE_URL = envVars.GAS_INTAKE_LIST_URL;

console.log('=== 問診シートヘッダー確認 ===\n');

const res = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const data = await res.json();
const rows = data.ok ? data.rows : data;

if (rows.length === 0) {
  console.log('❌ データが空です');
  process.exit(1);
}

const sample = rows[0];
const keys = Object.keys(sample);

console.log(`フィールド数: ${keys.length}\n`);

console.log('--- 全フィールド一覧 ---');
keys.forEach((key, i) => {
  console.log(`${(i + 1).toString().padStart(3)}. ${key}`);
});

// line_id関連のフィールドを検索
const lineFields = keys.filter(k => k.toLowerCase().includes('line'));

console.log('\n--- LINE関連フィールド ---');
if (lineFields.length > 0) {
  lineFields.forEach(k => {
    const sample = rows[0][k];
    console.log(`  ${k}: ${String(sample).substring(0, 40)}`);
  });
} else {
  console.log('  (見つかりません)');
}

// answerer_id フィールドを確認
const answererFields = keys.filter(k => k.toLowerCase().includes('answer'));

console.log('\n--- ANSWERER関連フィールド ---');
if (answererFields.length > 0) {
  answererFields.forEach(k => {
    const sample = rows[0][k];
    console.log(`  ${k}: ${String(sample).substring(0, 40)}`);
  });
} else {
  console.log('  (見つかりません)');
}

// patient_id フィールドを確認
const patientFields = keys.filter(k => k.toLowerCase().includes('patient'));

console.log('\n--- PATIENT関連フィールド ---');
if (patientFields.length > 0) {
  patientFields.forEach(k => {
    const sample = rows[0][k];
    console.log(`  ${k}: ${String(sample).substring(0, 40)}`);
  });
} else {
  console.log('  (見つかりません)');
}
