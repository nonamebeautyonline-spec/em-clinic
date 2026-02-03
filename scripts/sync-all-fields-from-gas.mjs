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

// 同期対象フィールド（answers JSONに格納）
const answerFields = [
  'timestamp', 'submittedAt', 'sex', 'birth', 'ng_check',
  'current_disease_yesno', 'current_disease_detail', 'glp_history',
  'med_yesno', 'med_detail', 'allergy_yesno', 'allergy_detail',
  'entry_route', 'entry_other', 'name_kana', 'tel', 'intakeId',
  'call_status', 'call_status_updated_at', 'verified_phone', 'verified_at',
  'delivery_date', 'time_band', 'hold_flag', 'hold_code',
  'delivery_updated_at', 'delivery_locked_at', 'doctor_note'
];

// 専用カラム
const columnFields = {
  'line_id': 'line_id',
  'answerer_id': 'answerer_id',
  'status': 'status',
  'prescription_menu': 'prescription_menu',
  'call_status': 'call_status',
  'call_status_updated_at': 'call_status_updated_at'
};

async function main() {
  console.log('=== 全フィールド同期開始 ===\n');

  // GASデータ取得
  console.log('GASデータ取得中...');
  const res = await fetch(gasUrl);
  const gasData = await res.json();
  console.log('GAS件数:', gasData.length);

  // GASをマップ化
  const gasMap = new Map();
  gasData.forEach(row => {
    const pid = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
    if (pid && !pid.startsWith('TEST_')) {
      gasMap.set(pid, row);
    }
  });
  console.log('有効GAS件数:', gasMap.size, '\n');

  // DBデータ取得（ページネーション）
  console.log('DBデータ取得中...');
  let dbData = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('intake')
      .select('patient_id, answers, line_id, answerer_id, status, prescription_menu, call_status, call_status_updated_at')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error:', error.message);
      break;
    }

    if (!data || data.length === 0) break;
    dbData = dbData.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  console.log('DB件数:', dbData.length, '\n');

  // 更新対象を特定
  const updates = [];

  dbData.forEach(dbRow => {
    const gasRow = gasMap.get(dbRow.patient_id);
    if (!gasRow) return;

    const currentAnswers = dbRow.answers || {};
    const newAnswers = { ...currentAnswers };
    let answersChanged = false;

    // answersフィールドの更新
    answerFields.forEach(field => {
      const gasVal = gasRow[field];
      const dbVal = currentAnswers[field];

      if (gasVal !== undefined && gasVal !== null && String(gasVal).trim() !== '') {
        if (dbVal === undefined || dbVal === null || String(dbVal).trim() === '') {
          newAnswers[field] = gasVal;
          answersChanged = true;
        }
      }
    });

    // カラムフィールドの更新
    const columnUpdates = {};

    if (gasRow.line_id && !dbRow.line_id) {
      columnUpdates.line_id = gasRow.line_id;
    }
    if (gasRow.answerer_id && !dbRow.answerer_id) {
      columnUpdates.answerer_id = String(gasRow.answerer_id);
    }
    if (gasRow.status && !dbRow.status) {
      columnUpdates.status = gasRow.status;
    }
    if (gasRow.prescription_menu && !dbRow.prescription_menu) {
      columnUpdates.prescription_menu = gasRow.prescription_menu;
    }
    if (gasRow.call_status && !dbRow.call_status) {
      columnUpdates.call_status = gasRow.call_status;
    }

    if (answersChanged || Object.keys(columnUpdates).length > 0) {
      updates.push({
        patient_id: dbRow.patient_id,
        answers: answersChanged ? newAnswers : undefined,
        ...columnUpdates
      });
    }
  });

  console.log('更新対象:', updates.length, '件\n');

  if (updates.length === 0) {
    console.log('✅ 更新不要');
    return;
  }

  // 更新実行
  console.log('更新開始...');
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < updates.length; i++) {
    const { patient_id, answers, ...columns } = updates[i];

    const updateData = { ...columns };
    if (answers) {
      updateData.answers = answers;
    }

    const { error } = await supabase
      .from('intake')
      .update(updateData)
      .eq('patient_id', patient_id);

    if (error) {
      errorCount++;
      if (errorCount <= 5) {
        console.log('❌', patient_id, ':', error.message);
      }
    } else {
      successCount++;
    }

    if ((i + 1) % 100 === 0) {
      console.log('進捗:', i + 1, '/', updates.length);
    }

    if (i % 50 === 0) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log('\n=== 同期完了 ===');
  console.log('成功:', successCount);
  console.log('失敗:', errorCount);
}

main().catch(console.error);
