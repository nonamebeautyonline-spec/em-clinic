// get-gas-data.mjs
// GASシートから特定のpatient_idのデータを取得

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

const targetPids = ["20260101591", "20260101592"];

console.log('=== GASシートからデータ取得 ===\n');

const gasRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

for (const pid of targetPids) {
  console.log(`\n--- patient_id: ${pid} ---`);

  const gasMatch = gasRows.find(r => String(r.patient_id).trim() === pid);

  if (!gasMatch) {
    console.log('  ❌ GASシートに見つかりません');
    continue;
  }

  console.log('  ✅ GASシートに存在');
  console.log('  patient_name:', gasMatch.patient_name || gasMatch.name || '(なし)');
  console.log('  sex:', gasMatch.sex || '(なし)');
  console.log('  birth:', gasMatch.birth || '(なし)');
  console.log('  name_kana:', gasMatch.name_kana || '(なし)');
  console.log('  tel:', gasMatch.tel || '(なし)');
  console.log('  answerer_id:', gasMatch.answerer_id || '(なし)');
  console.log('  line_id:', gasMatch.line_id || '(なし)');
}
