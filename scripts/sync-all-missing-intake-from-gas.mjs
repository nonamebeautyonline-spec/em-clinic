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

async function syncAllMissingIntake() {
  console.log('=== 1/30修正前の予約でintake抜けを全て同期 ===\n');

  const fixTime = '2026-01-30T04:00:00Z';

  // 1/30以前の予約を取得（キャンセル除外）
  const { data: oldReservations } = await supabase
    .from('reservations')
    .select('patient_id, reserve_id, created_at')
    .lt('created_at', fixTime)
    .neq('status', 'canceled')
    .order('created_at', { ascending: false });

  console.log(`1/30修正前の予約: ${oldReservations ? oldReservations.length : 0}件\n`);

  // intake全件取得
  let allIntake = [];
  let page = 0;
  const pageSize = 1000;

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

  // intakeに存在しない予約を抽出（テストデータを除外）
  const missing = oldReservations.filter(r =>
    !intakeSet.has(r.patient_id) && !r.patient_id.startsWith('TEST_')
  );

  console.log(`intakeに存在しない予約（テスト除外）: ${missing.length}件\n`);

  if (missing.length === 0) {
    console.log('✅ 同期が必要なデータはありません');
    return;
  }

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

  // 対象患者のpatient_idリスト
  const missingPatientIds = missing.map(r => r.patient_id);

  // GASデータから対象患者を抽出
  const targetData = allGasData.filter(row => {
    const pidStr = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
    return missingPatientIds.includes(pidStr);
  });

  console.log(`GASシートに存在する対象患者: ${targetData.length}件\n`);

  if (targetData.length === 0) {
    console.log('❌ GASシートに対象患者が見つかりません');
    return;
  }

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  console.log('同期開始...\n');

  for (const row of targetData) {
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
      if (successCount % 50 === 0) {
        console.log(`進捗: ${successCount}/${targetData.length}件`);
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

  // GASシートに存在しない患者を確認
  const notInGas = missingPatientIds.filter(pid => {
    return !targetData.some(row => {
      const pidStr = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
      return pidStr === pid;
    });
  });

  if (notInGas.length > 0) {
    console.log(`\n⚠️ GASシートに存在しない患者: ${notInGas.length}件`);
    console.log('最初の10件:', notInGas.slice(0, 10));
  }

  // 検証
  console.log('\n=== 検証: intakeに存在しない予約を再確認 ===\n');

  // intake再取得
  allIntake = [];
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

  const newIntakeSet = new Set(allIntake.map(i => i.patient_id));
  const stillMissing = oldReservations.filter(r =>
    !newIntakeSet.has(r.patient_id) && !r.patient_id.startsWith('TEST_')
  );

  console.log(`残りのintake抜け: ${stillMissing.length}件`);

  if (stillMissing.length > 0) {
    console.log('\n最初の10件:');
    stillMissing.slice(0, 10).forEach((r, i) => {
      console.log(`${i+1}. ${r.patient_id}`);
    });
  } else {
    console.log('✅ 全て同期されました！');
  }
}

syncAllMissingIntake().catch(console.error);
