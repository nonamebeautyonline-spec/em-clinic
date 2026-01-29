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

const gasResponse = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasResponse.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

const found = gasRows.find(r => String(r.patient_id) === '20260101585');

if (found) {
  console.log('=== GAS生データ ===');
  console.log('patient_id:', found.patient_id);
  console.log('name:', found.name);
  console.log('sex:', found.sex);
  console.log('name_kana:', found.name_kana);
  console.log('tel:', found.tel);
  console.log('answerer_id:', found.answerer_id);
  console.log('reserved_date:', found.reserved_date);
  console.log('reserved_time:', found.reserved_time);
  console.log('');
  console.log('=== 生JSON（最初の2000文字） ===');
  console.log(JSON.stringify(found, null, 2).substring(0, 2000));
} else {
  console.log('Not found in GAS');
}
