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

const missingPatients = [
  '20260100756', // 清原杏子
  '20260100331',
  '20260100026',
  '20260100447', // 伊藤愛梨
  '20260100713'
];

async function syncMissingPatients() {
  console.log('=== intakeに存在しない7人をGASから同期 ===\n');

  // GASから全データ取得
  const gasUrl = process.env.GAS_MYPAGE_URL;
  if (!gasUrl) {
    console.error('❌ GAS_MYPAGE_URL が設定されていません');
    return;
  }

  const res = await fetch(gasUrl);
  const allData = await res.json();

  // 対象患者をフィルタ
  const targetData = allData.filter(row => {
    const pidStr = row.Patient_ID || String(row.patient_id || '');
    return missingPatients.includes(pidStr);
  });

  console.log(`GASシートから抽出: ${targetData.length}件\n`);

  if (targetData.length === 0) {
    console.log('❌ 対象患者がGASシートに見つかりません');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const row of targetData) {
    const pidStr = row.Patient_ID || String(row.patient_id || '');

    // answersオブジェクトを構築
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
      マンジャロ既往: row['マンジャロ既往'] || '',
      リベルサス既往: row['リベルサス既往'] || '',
      サクセンダ既往: row['サクセンダ既往'] || '',
      オゼンピック既往: row['オゼンピック既往'] || '',
      ウゴービ既往: row['ウゴービ既往'] || '',
      ダイエット目的: row['ダイエット目的'] || '',
      カウンセリング希望: row['カウンセリング希望'] || '',
      診療方法: row['診療方法'] || '',
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

    console.log(`同期中: ${pidStr} (${intakeData.patient_name})`);

    const { data, error } = await supabase
      .from('intake')
      .upsert(intakeData, {
        onConflict: 'patient_id',
      })
      .select();

    if (error) {
      console.error(`  ❌ エラー: ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ 成功`);
      successCount++;
    }

    // レート制限回避
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n=== 同期完了 ===');
  console.log(`成功: ${successCount}件`);
  console.log(`失敗: ${errorCount}件`);

  // 検証
  console.log('\n=== 検証 ===');
  for (const pid of missingPatients) {
    const { data } = await supabase
      .from('intake')
      .select('patient_id, patient_name')
      .eq('patient_id', pid)
      .maybeSingle();

    if (data) {
      console.log(`✅ ${pid}: ${data.patient_name}`);
    } else {
      console.log(`❌ ${pid}: まだ存在しない`);
    }
  }
}

syncMissingPatients().catch(console.error);
