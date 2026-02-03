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

// ユーザー指定の全フィールド
const allFields = [
  'timestamp', 'reserveId', 'submittedAt', 'name', 'sex', 'birth', 'line_id',
  'reserved_date', 'reserved_time', 'ng_check', 'current_disease_yesno',
  'current_disease_detail', 'glp_history', 'med_yesno', 'med_detail',
  'allergy_yesno', 'allergy_detail', 'entry_route', 'entry_other',
  'status', 'doctor_note', 'prescription_menu', 'name_kana', 'tel',
  'answerer_id', 'patient_id', 'intakeId', 'call_status',
  'call_status_updated_at', 'verified_phone', 'verified_at'
];

async function main() {
  console.log('=== 指定フィールド全件確認 ===\n');

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
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) break;
    if (!data || data.length === 0) break;
    dbData = dbData.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log('GAS有効件数:', gasMap.size);
  console.log('DB件数:', dbData.length, '\n');

  console.log('フィールド                | GASあり | DBあり | 不足');
  console.log('--------------------------|---------|--------|------');

  const missing = [];

  allFields.forEach(field => {
    let gasHas = 0, dbHas = 0, stillMissing = 0;

    dbData.forEach(dbRow => {
      const gasRow = gasMap.get(dbRow.patient_id);
      if (!gasRow) return;

      const gasVal = gasRow[field];
      
      // DBでの値を探す（専用カラム or answers内）
      let dbVal = dbRow[field];
      if (dbVal === undefined || dbVal === null) {
        dbVal = dbRow.answers?.[field];
      }
      // 特殊マッピング
      if (field === 'name' && !dbVal) dbVal = dbRow.patient_name;
      if (field === 'reserveId' && !dbVal) dbVal = dbRow.reserve_id || dbRow.answers?.reserved;
      if (field === 'doctor_note' && !dbVal) dbVal = dbRow.note;

      if (gasVal !== undefined && gasVal !== null && String(gasVal).trim() !== '') gasHas++;
      if (dbVal !== undefined && dbVal !== null && String(dbVal).trim() !== '') dbHas++;
      if (gasVal && String(gasVal).trim() !== '' && (!dbVal || String(dbVal).trim() === '')) {
        stillMissing++;
      }
    });

    const name = field.padEnd(25);
    const status = stillMissing > 0 ? ' ← 要対応' : '';
    console.log(name + ' | ' + String(gasHas).padStart(7) + ' | ' + String(dbHas).padStart(6) + ' | ' + String(stillMissing).padStart(4) + status);
    
    if (stillMissing > 0) {
      missing.push({ field, stillMissing, gasHas });
    }
  });

  if (missing.length > 0) {
    console.log('\n=== 不足があるフィールド ===');
    missing.forEach(m => {
      console.log(m.field + ': ' + m.stillMissing + '件不足 (GASに' + m.gasHas + '件)');
    });
  } else {
    console.log('\n✅ 全フィールド同期完了');
  }
}

main().catch(console.error);
