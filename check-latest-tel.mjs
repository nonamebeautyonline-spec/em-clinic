// check-latest-tel.mjs
// 最新の問診データのtel（X列）とverified_phone（AG列）を確認

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

console.log('=== 最新の問診データのtel確認 ===\n');

// GASから取得
const gasResponse = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasResponse.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

// 最新2件
const latestPids = ['20260101583', '20260101161'];

for (const pid of latestPids) {
  const row = gasRows.find(r => r.patient_id === pid);

  if (row) {
    console.log(`PID: ${pid} (${row.patient_name || row.name})`);
    console.log(`  reserveId: ${row.reserveId || row.reserve_id}`);
    console.log(`  予約: ${row.reserved_date} ${row.reserved_time}`);

    // X列（tel）
    const tel = row.tel || '';
    const telFromAnswers = (row.answers && row.answers.tel) || '';
    console.log(`  X列 tel: ${tel || '(空)'}`);
    if (telFromAnswers && telFromAnswers !== tel) {
      console.log(`  answers.tel: ${telFromAnswers}`);
    }

    // AG列（verified_phone）
    const verifiedPhone = row.verified_phone || '';
    console.log(`  AG列 verified_phone: ${verifiedPhone || '(空)'}`);

    // 判定
    if (!tel && verifiedPhone) {
      console.log('  ❌ verified_phoneはあるが、telが空');
    } else if (tel && verifiedPhone && tel !== verifiedPhone) {
      console.log('  ⚠️ telとverified_phoneが異なる');
    } else if (tel) {
      console.log('  ✅ telに電話番号あり');
    } else {
      console.log('  ❌ telもverified_phoneも空');
    }

    console.log('');
  } else {
    console.log(`PID: ${pid} - データが見つかりません\n`);
  }
}

console.log('=== 完了 ===');
