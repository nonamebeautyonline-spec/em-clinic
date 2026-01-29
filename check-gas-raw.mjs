// check-gas-raw.mjs
// GASから直接生データを取得して確認

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
const targetPid = '20260101584';

console.log('=== GAS生データ確認 ===\n');

// GASから取得
const gasResponse = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasResponse.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

console.log(`全件数: ${gasRows.length}件\n`);

// 最新20件のpatient_idを表示
console.log('最新20件のpatient_id:');
gasRows.slice(0, 20).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.patient_id} - ${r.patient_name || r.name}`);
});

// 対象のpatient_idを検索
const found = gasRows.find(r => r.patient_id === targetPid);

console.log(`\n[検索結果] PID ${targetPid}:`);
if (found) {
  console.log('✅ 見つかりました');
  console.log(JSON.stringify(found, null, 2));
} else {
  console.log('❌ 見つかりません');

  // 類似のpatient_idを検索
  const similar = gasRows.filter(r =>
    r.patient_id && r.patient_id.includes('584')
  );

  if (similar.length > 0) {
    console.log('\n類似のpatient_id:');
    similar.forEach(r => {
      console.log(`  ${r.patient_id} - ${r.patient_name || r.name}`);
    });
  }
}

console.log('\n=== 完了 ===');
