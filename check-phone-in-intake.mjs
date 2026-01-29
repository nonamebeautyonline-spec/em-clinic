// check-phone-in-intake.mjs
// 問診シートに電話番号があるか確認

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

const GAS_INTAKE_URL = envVars.GAS_INTAKE_URL || envVars.GAS_INTAKE_LIST_URL;

console.log('=== 問診シートに電話番号があるか確認 ===\n');

// GASから取得
const gasResponse = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasResponse.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

// 今日の予約で電話番号なしの患者1人のデータを詳細表示
const todayStr = '2026-01-29';
const gasTodayRows = gasRows.filter(r => {
  const date = String(r.reserved_date || '').trim().slice(0, 10);
  return date === todayStr;
});

const testPatient = gasTodayRows.find(r => r.patient_id === '20260101561');

if (testPatient) {
  console.log('PID: 20260101561（足立紗雪）のデータ:\n');

  console.log('[トップレベルフィールド]');
  const topFields = ['tel', 'phone', '電話番号', 'telephone', 'patient_tel'];
  topFields.forEach(field => {
    if (testPatient[field] !== undefined) {
      console.log(`  ${field}: ${testPatient[field] || '(空)'}`);
    }
  });
  console.log('');

  console.log('[answersフィールド内]');
  if (testPatient.answers) {
    Object.keys(testPatient.answers).forEach(key => {
      if (key.toLowerCase().includes('tel') || key.toLowerCase().includes('phone') || key.includes('電話')) {
        console.log(`  answers.${key}: ${testPatient.answers[key]}`);
      }
    });
  }
  console.log('');

  console.log('[全フィールドから電話関連を検索]');
  Object.keys(testPatient).forEach(key => {
    if ((key.toLowerCase().includes('tel') || key.toLowerCase().includes('phone') || key.includes('電話')) && key !== 'answers') {
      console.log(`  ${key}: ${testPatient[key]}`);
    }
  });
  console.log('');

  // answersの全キーを表示
  console.log('[answersの全キー（最初の20個）]');
  if (testPatient.answers) {
    Object.keys(testPatient.answers).slice(0, 20).forEach(key => {
      console.log(`  ${key}: ${String(testPatient.answers[key]).substring(0, 50)}`);
    });
  }
}

console.log('\n=== 完了 ===');
