import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) {
    let val = vals.join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key.trim()] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const gasUrl = env.GAS_MYPAGE_URL;

const checkFields = [
  'timestamp', 'submittedAt', 'sex', 'birth', 'ng_check',
  'glp_history', 'med_detail', 'allergy_detail', 'name_kana', 'tel',
  'verified_phone', 'verified_at', 'doctor_note'
];

async function main() {
  console.log('=== 同期結果検証 ===\n');

  const res = await fetch(gasUrl);
  const gasData = await res.json();

  const gasMap = new Map();
  gasData.forEach(row => {
    const pid = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
    if (pid && !pid.startsWith('TEST_')) {
      gasMap.set(pid, row);
    }
  });

  let dbData = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('intake')
      .select('patient_id, answers, note, status, prescription_menu, line_id, answerer_id')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) break;
    if (!data || data.length === 0) break;
    dbData = dbData.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log('GAS有効件数:', gasMap.size);
  console.log('DB件数:', dbData.length, '\n');

  console.log('【answers内フィールド】\n');
  console.log('フィールド          | GASあり | DBあり | 不足');
  console.log('--------------------|---------|--------|------');

  checkFields.forEach(field => {
    let gasHas = 0, dbHas = 0, stillMissing = 0;

    dbData.forEach(dbRow => {
      const gasRow = gasMap.get(dbRow.patient_id);
      if (!gasRow) return;

      const gasVal = gasRow[field];
      const dbVal = dbRow.answers?.[field];

      if (gasVal !== undefined && gasVal !== null && String(gasVal).trim() !== '') gasHas++;
      if (dbVal !== undefined && dbVal !== null && String(dbVal).trim() !== '') dbHas++;
      if (gasVal && String(gasVal).trim() !== '' && (!dbVal || String(dbVal).trim() === '')) stillMissing++;
    });

    const name = field.padEnd(19);
    console.log(name + ' | ' + String(gasHas).padStart(7) + ' | ' + String(dbHas).padStart(6) + ' | ' + String(stillMissing).padStart(4));
  });

  console.log('\n【専用カラム】\n');
  console.log('カラム              | GASあり | DBあり | 不足');
  console.log('--------------------|---------|--------|------');

  const columnChecks = [
    { db: 'note', gas: 'doctor_note' },
    { db: 'status', gas: 'status' },
    { db: 'prescription_menu', gas: 'prescription_menu' },
    { db: 'line_id', gas: 'line_id' },
    { db: 'answerer_id', gas: 'answerer_id' }
  ];

  columnChecks.forEach(({ db, gas }) => {
    let gasHas = 0, dbHas = 0, stillMissing = 0;

    dbData.forEach(dbRow => {
      const gasRow = gasMap.get(dbRow.patient_id);
      if (!gasRow) return;

      const gasVal = gasRow[gas];
      const dbVal = dbRow[db];

      if (gasVal !== undefined && gasVal !== null && String(gasVal).trim() !== '') gasHas++;
      if (dbVal !== undefined && dbVal !== null && String(dbVal).trim() !== '') dbHas++;
      if (gasVal && String(gasVal).trim() !== '' && (!dbVal || String(dbVal).trim() === '')) stillMissing++;
    });

    const name = db.padEnd(19);
    console.log(name + ' | ' + String(gasHas).padStart(7) + ' | ' + String(dbHas).padStart(6) + ' | ' + String(stillMissing).padStart(4));
  });
}

main().catch(console.error);
