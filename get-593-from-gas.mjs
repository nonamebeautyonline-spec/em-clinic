// get-593-from-gas.mjs
// GASから20260101593の情報を取得

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
const targetPid = "20260101593";

console.log(`=== GASから${targetPid}を取得 ===\n`);

const gasRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

console.log(`総件数: ${gasRows.length}件\n`);

const gasMatch = gasRows.find(r => String(r.patient_id).trim() === targetPid);

if (!gasMatch) {
  console.error(`❌ ${targetPid}が見つかりません`);
  console.log('\n最新5件:');
  gasRows.slice(0, 5).forEach(r => {
    console.log(`  ${r.patient_id}: ${r.patient_name || r.name}`);
  });
  process.exit(1);
}

console.log(`✅ 見つかりました\n`);
console.log('patient_id:', gasMatch.patient_id);
console.log('patient_name:', gasMatch.patient_name || gasMatch.name || '(なし)');
console.log('sex:', gasMatch.sex || '(なし)');
console.log('birth:', gasMatch.birth || '(なし)');
console.log('name_kana:', gasMatch.name_kana || '(なし)');
console.log('tel:', gasMatch.tel || '(なし)');
console.log('answerer_id:', gasMatch.answerer_id || '(なし)');
console.log('line_id:', gasMatch.line_id || '(なし)');

console.log('\nfix-593.mjsを作成します...');
