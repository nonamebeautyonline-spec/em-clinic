// check-today-no-phone.mjs
// 今日の予約で電話番号がない患者を確認

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

const todayStr = '2026-01-29';

console.log('=== 今日の予約で電話番号なし ===\n');

// GASから取得
console.log('GASから取得中...');
const gasResponse = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasResponse.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

const gasTodayRows = gasRows.filter(r => {
  const date = String(r.reserved_date || r['予約日'] || '').trim().slice(0, 10);
  return date === todayStr;
});

console.log(`今日の予約: ${gasTodayRows.length}件\n`);

// 電話番号がない患者をフィルタ
const noPhoneRows = gasTodayRows.filter(r => {
  const tel = String(r.tel || r['電話番号'] || r.phone || '').trim();
  const answers = r.answers || {};
  const telFromAnswers = String(answers.tel || answers['電話番号'] || '').trim();

  return !tel && !telFromAnswers;
});

console.log(`電話番号なし: ${noPhoneRows.length}件\n`);

if (noPhoneRows.length > 0) {
  console.log('--- 電話番号なしの患者 ---\n');
  noPhoneRows.forEach((row, i) => {
    console.log(`${i + 1}. PID: ${row.patient_id}`);
    console.log(`   名前: ${row.patient_name || row.name || row['氏名']}`);
    console.log(`   予約時間: ${row.reserved_time || row['予約時間']}`);
    console.log(`   reserveId: ${row.reserveId || row.reserve_id}`);
    console.log('');
  });
} else {
  console.log('✅ 全員に電話番号が登録されています\n');
}

console.log('=== 完了 ===');
