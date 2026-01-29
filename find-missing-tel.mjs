import { createClient } from '@supabase/supabase-js';
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('=== 電話番号欠損レコードを検索 ===\n');

console.log('1. Supabaseから最新100件取得中...');
const { data: intakes, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, answers, created_at')
  .order('created_at', { ascending: false })
  .limit(100);

if (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

const missingTel = intakes.filter(i => {
  const tel = i.answers?.電話番号 || i.answers?.tel;
  return !tel || tel === '';
});

console.log(`  取得: ${intakes.length}件`);
console.log(`  電話番号欠損: ${missingTel.length}件\n`);

if (missingTel.length === 0) {
  console.log('✅ 電話番号欠損なし');
  process.exit(0);
}

console.log('2. GASシートから全データ取得中...');
const gasRes = await fetch(envVars.GAS_INTAKE_LIST_URL);
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;
console.log(`  取得: ${gasRows.length}件\n`);

const gasMap = new Map();
for (const row of gasRows) {
  const pid = String(row.patient_id || '').trim();
  if (pid) {
    gasMap.set(pid, row);
  }
}

console.log('3. 電話番号欠損レコード:\n');

for (const record of missingTel) {
  const pid = record.patient_id;
  const gasMatch = gasMap.get(pid);

  console.log(`${pid}: ${record.patient_name || '(名前なし)'}`);
  console.log(`  created_at: ${record.created_at}`);

  if (gasMatch && gasMatch.tel) {
    console.log(`  ✅ GASに電話番号あり: ${gasMatch.tel}`);
  } else {
    console.log(`  ❌ GASにも電話番号なし`);
  }
  console.log('');
}

console.log(`\n=== 結果 ===`);
console.log(`電話番号欠損: ${missingTel.length}件`);

const fixable = missingTel.filter(r => {
  const gasMatch = gasMap.get(r.patient_id);
  return gasMatch && gasMatch.tel;
});

console.log(`補完可能: ${fixable.length}件`);
