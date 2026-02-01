import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncAllIntakeFromGAS() {
  console.log('=== GASの全問診データをSupabaseに同期 ===\n');

  // GASから全データ取得
  const gasUrl = process.env.GAS_MYPAGE_URL;
  if (!gasUrl) {
    console.error('❌ GAS_MYPAGE_URL が設定されていません');
    return;
  }

  console.log('GASシートから全データ取得中...');
  const res = await fetch(gasUrl);
  const allGasData = await res.json();
  console.log(`GASデータ: ${allGasData.length}件\n`);

  // 既存のintake件数を確認
  let existingIntake = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data } = await supabase
      .from('intake')
      .select('patient_id')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!data || data.length === 0) break;
    existingIntake = existingIntake.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  const existingSet = new Set(existingIntake.map(i => i.patient_id));
  console.log(`既存intake: ${existingIntake.length}件\n`);

  // GASデータから有効な患者を抽出（TEST_除外）
  const validData = allGasData.filter(row => {
    const pidStr = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
    return pidStr && !pidStr.startsWith('TEST_');
  });

  console.log(`有効なGASデータ: ${validData.length}件\n`);

  // 新規追加と更新を分類
  const toInsert = validData.filter(row => {
    const pidStr = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
    return !existingSet.has(pidStr);
  });

  const toUpdate = validData.filter(row => {
    const pidStr = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
    return existingSet.has(pidStr);
  });

  console.log(`新規追加: ${toInsert.length}件`);
  console.log(`更新: ${toUpdate.length}件\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  console.log('同期開始...\n');

  // 全データを同期（upsertで新規・更新両対応）
  for (const row of validData) {
    const pidStr = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();

    const answers = {
      name: row.name || row['氏名'] || '',
      sex: row.sex || '',
      birth: row.birth || '',
      ng_check: row.ng_check || '',
      allergy: row.allergy || '',
      pregnancy: row.pregnancy || '',
      breastfeeding: row.breastfeeding || '',
      disease: row.disease || '',
      medication: row.medication || '',
      height: row.height || '',
      weight: row.weight || '',
      希望メニュー: row['希望メニュー'] || '',
      email: row.email || '',
      timestamp: row.timestamp || row.submittedAt || '',
    };

    const intakeData = {
      reserve_id: row.reserveId || row.reserved || null,
      patient_id: pidStr,
      answerer_id: row.answerer_id || null,
      line_id: row.line_id || null,
      patient_name: row.name || row['氏名'] || '',
      answers: answers,
      reserved_date: row.reserved_date || row['予約日'] || null,
      reserved_time: row.reserved_time || row['予約時間'] || null,
      status: row.status || null,
      note: row.note || null,
      prescription_menu: row.prescription_menu || null,
    };

    const { error } = await supabase
      .from('intake')
      .upsert(intakeData, { onConflict: 'patient_id' });

    if (error) {
      errorCount++;
      errors.push({ patient_id: pidStr, error: error.message });
      if (errorCount <= 10) {
        console.log(`❌ ${pidStr} (${intakeData.patient_name}): ${error.message}`);
      }
    } else {
      successCount++;
      if (successCount % 100 === 0) {
        console.log(`進捗: ${successCount}/${validData.length}件`);
      }
    }

    // レート制限回避
    if (successCount % 10 === 0) {
      await new Promise(r => setTimeout(r, 500));
    } else {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log('\n=== 同期完了 ===');
  console.log(`成功: ${successCount}件`);
  console.log(`失敗: ${errorCount}件`);

  if (errorCount > 0 && errorCount <= 10) {
    console.log('\nエラー詳細:');
    errors.forEach(e => {
      console.log(`  ${e.patient_id}: ${e.error}`);
    });
  }

  // 検証
  console.log('\n=== 検証: 全予約のintake同期状況 ===\n');

  // 全予約を取得
  let allReservations = [];
  page = 0;

  while (true) {
    const { data } = await supabase
      .from('reservations')
      .select('patient_id, status')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!data || data.length === 0) break;
    allReservations = allReservations.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  // intake再取得
  let allIntake = [];
  page = 0;

  while (true) {
    const { data } = await supabase
      .from('intake')
      .select('patient_id')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!data || data.length === 0) break;
    allIntake = allIntake.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  const intakeSet = new Set(allIntake.map(i => i.patient_id));

  // intakeに存在しない予約
  const missingInIntake = allReservations.filter(r =>
    !intakeSet.has(r.patient_id) && !r.patient_id.startsWith('TEST_')
  );

  // ステータス別に分類
  const missingByStatus = {};
  missingInIntake.forEach(r => {
    const status = r.status || 'null';
    missingByStatus[status] = (missingByStatus[status] || 0) + 1;
  });

  console.log(`予約総件数: ${allReservations.length}件`);
  console.log(`intake総件数: ${allIntake.length}件`);
  console.log(`\n✅ intakeあり: ${allReservations.length - missingInIntake.length}件`);
  console.log(`❌ intakeなし: ${missingInIntake.length}件\n`);

  if (missingInIntake.length > 0) {
    console.log('intakeなしの内訳（ステータス別）:');
    Object.keys(missingByStatus).sort().forEach(status => {
      console.log(`  ${status}: ${missingByStatus[status]}件`);
    });

    console.log('\n最初の10件:');
    missingInIntake.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. ${r.patient_id} - status: ${r.status}`);
    });
  } else {
    console.log('✅ 全予約のintakeが同期されました！');
  }
}

syncAllIntakeFromGAS().catch(console.error);
