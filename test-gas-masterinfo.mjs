// test-gas-masterinfo.mjs
// GASがmasterInfoを返すかテスト

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

const GAS_INTAKE_URL = envVars.GAS_INTAKE_URL;

console.log('=== GAS masterInfo返却テスト ===\n');

// 既存の患者でテスト（20260101591: 問診マスターに存在）
const testPayload = {
  type: 'intake',
  patient_id: '20260101591',
  skipSupabase: true,  // ★ これがキー
  answers: {
    test: 'data'
  }
};

console.log('送信データ:');
console.log('  patient_id:', testPayload.patient_id);
console.log('  skipSupabase:', testPayload.skipSupabase);
console.log('');

const res = await fetch(GAS_INTAKE_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testPayload)
});

const text = await res.text();

console.log('レスポンスステータス:', res.status);
console.log('');

let json;
try {
  json = JSON.parse(text);
} catch (e) {
  console.error('❌ JSON parseエラー:', e.message);
  console.log('レスポンス:', text.substring(0, 500));
  process.exit(1);
}

console.log('レスポンスキー:', Object.keys(json));
console.log('');

if (json.masterInfo) {
  console.log('✅ masterInfoが返されています:');
  console.log('  name:', json.masterInfo.name || '(なし)');
  console.log('  sex:', json.masterInfo.sex || '(なし)');
  console.log('  birth:', json.masterInfo.birth || '(なし)');
  console.log('  nameKana:', json.masterInfo.nameKana || '(なし)');
  console.log('  answererId:', json.masterInfo.answererId || '(なし)');
  console.log('  lineUserId:', json.masterInfo.lineUserId || '(なし)');
} else {
  console.log('❌ masterInfoが返されていません');
  console.log('');
  console.log('レスポンス全体:');
  console.log(JSON.stringify(json, null, 2));
}
