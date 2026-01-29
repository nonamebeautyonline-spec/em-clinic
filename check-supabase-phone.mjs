// check-supabase-phone.mjs
// Supabaseに電話番号が同期されているか確認

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

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== Supabaseの電話番号確認 ===\n');

// さっきまで電話番号がなかった患者3人を確認
const testPids = [
  { id: '20260101561', name: '足立紗雪' },
  { id: '20260101567', name: '中野　大輔' },
  { id: '20260101581', name: '池田菜々子' }
];

for (const patient of testPids) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/intake?patient_id=eq.${patient.id}`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const data = await response.json();

    if (data.length > 0) {
      const row = data[0];
      const tel = row.tel || '';
      const telFromAnswers = (row.answers && row.answers.tel) || '';

      console.log(`PID: ${patient.id} (${patient.name})`);
      console.log(`  telカラム: ${tel || '(なし)'}`);
      console.log(`  answers.tel: ${telFromAnswers || '(なし)'}`);

      if (tel || telFromAnswers) {
        console.log('  ✅ 電話番号あり');
      } else {
        console.log('  ❌ 電話番号なし');
      }
      console.log('');
    } else {
      console.log(`PID: ${patient.id} - Supabaseに存在しません\n`);
    }
  } catch (e) {
    console.log(`PID: ${patient.id} - エラー: ${e.message}\n`);
  }
}

console.log('=== 完了 ===');
