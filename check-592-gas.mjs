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
const pid = "20260101592";

console.log(`=== patient_id: ${pid} をGASシートから取得 ===\n`);

const gasRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

console.log(`総件数: ${gasRows.length}件`);

const gasMatch = gasRows.find(r => String(r.patient_id).trim() === pid);

if (!gasMatch) {
  console.log(`\n❌ patient_id: ${pid} が見つかりません`);

  // 最新10件を表示
  console.log('\n最新10件:');
  gasRows.slice(0, 10).forEach(r => {
    console.log(`  ${r.patient_id}: ${r.patient_name || r.name}`);
  });
  process.exit(1);
}

console.log(`\n✅ 見つかりました`);
console.log('  patient_name:', gasMatch.patient_name || gasMatch.name || '(なし)');
console.log('  sex:', gasMatch.sex || '(なし)');
console.log('  birth:', gasMatch.birth || '(なし)');
console.log('  name_kana:', gasMatch.name_kana || '(なし)');
console.log('  tel:', gasMatch.tel || '(なし)');
console.log('  answerer_id:', gasMatch.answerer_id || '(なし)');
console.log('  line_id:', gasMatch.line_id || '(なし)');
