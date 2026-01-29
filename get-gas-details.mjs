// get-gas-details.mjs
// GASシートから3人の詳細データを取得

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

console.log('=== GASシートから詳細データ取得 ===\n');

const gasRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

const targetPids = ["20260101541", "20260101551", "20251200673"];

for (const pid of targetPids) {
  const row = gasRows.find(r => String(r.patient_id || '').trim() === pid);
  if (row) {
    console.log(`\n=== ${pid} ===`);
    console.log(JSON.stringify(row, null, 2));
  } else {
    console.log(`\n❌ ${pid}: GASに見つかりません`);
  }
}
