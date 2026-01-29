// test-gas-masterinfo.mjs
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

const GAS_INTAKE_LIST_URL = envVars.GAS_INTAKE_LIST_URL;

console.log('=== GAS masterInfo返却テスト ===\n');

const testPatientId = "20260101596";
const payload = {
  type: "intake",
  patient_id: testPatientId,
  skipSupabase: true,
  answers: {
    ng_check: "no",
    current_disease_yesno: "no"
  },
  reserve_id: "test-reserve-" + Date.now(),
  reserved_date: "2026-02-01",
  reserved_time: "10:00"
};

console.log('1. GASにPOSTリクエスト送信');
console.log('  patient_id:', testPatientId);
console.log('  skipSupabase:', payload.skipSupabase);

const response = await fetch(GAS_INTAKE_LIST_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const text = await response.text();
let json;
try {
  json = JSON.parse(text);
} catch (e) {
  console.error('❌ JSONパースエラー');
  process.exit(1);
}

console.log('\n2. レスポンス受信');
console.log('  ok:', json.ok);

console.log('\n3. masterInfo確認');
if (json.masterInfo) {
  console.log('  ✅ masterInfoが返されました');
  console.log('  name:', json.masterInfo.name || '(空)');
  console.log('  answererId:', json.masterInfo.answererId || '(空)');
  console.log('  lineUserId:', json.masterInfo.lineUserId || '(空)');

  if (json.masterInfo.name) {
    console.log('\n✅ GASは正しくmasterInfoを返しています');
    console.log('→ 問題はVercel側のmasterInfo処理にあります');
  }
} else {
  console.log('  ❌ masterInfoが返されていません');
  console.log('  レスポンスキー:', Object.keys(json));
}
