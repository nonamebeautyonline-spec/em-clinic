// fix-patient-tel.mjs
// 特定の患者のAG列（verified_phone）→X列（tel）コピー

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
const patientId = process.argv[2] || '20260101583';

console.log(`=== PID ${patientId} のtel修正 ===\n`);

try {
  const response = await fetch(GAS_INTAKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'copy_verified_phone_to_tel',
      patient_id: patientId
    })
  });

  const result = await response.json();

  if (result.ok) {
    console.log('✅ GASでの更新完了');
    console.log(`   patient_id: ${result.patient_id}`);
    console.log(`   updated: ${result.updated ? 'はい（AG→Xコピー実行）' : 'いいえ（既に同じ値）'}`);
  } else {
    console.log('❌ GASでの更新失敗');
    console.log(`   error: ${result.error}`);
  }
} catch (e) {
  console.log('❌ エラー:', e.message);
}

console.log('\n=== 完了 ===');
