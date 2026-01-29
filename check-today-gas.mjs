// check-today-gas.mjs
// 今日の予約をGASから取得

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

console.log('=== 今日の予約（GAS）===\n');

const gasResponse = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasResponse.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

// 今日の予約をフィルタ
const todayReservations = gasRows.filter(r => {
  const date = String(r.reserved_date || '').trim().slice(0, 10);
  return date === todayStr;
});

console.log(`今日の予約: ${todayReservations.length}件\n`);

// PID順にソート
todayReservations.sort((a, b) => {
  const pidA = String(a.patient_id || '');
  const pidB = String(b.patient_id || '');
  return pidA.localeCompare(pidB);
});

// 表示
todayReservations.forEach((r, i) => {
  console.log(`${i + 1}. PID: ${r.patient_id}`);
  console.log(`   名前: ${r.patient_name || r.name}`);
  console.log(`   時間: ${r.reserved_time}`);
  console.log(`   reserveId: ${r.reserveId || r.reserve_id}`);
  console.log('');
});

// 584を含むPIDを検索
const with584 = gasRows.filter(r => {
  const pid = String(r.patient_id || '');
  return pid.indexOf('584') >= 0;
});

if (with584.length > 0) {
  console.log('\n"584"を含むPID:');
  with584.forEach(r => {
    console.log(`  ${r.patient_id} - ${r.patient_name || r.name} - ${r.reserved_date}`);
  });
}

console.log('\n=== 完了 ===');
