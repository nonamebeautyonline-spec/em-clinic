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

// クレカ1件 + 銀行振込3件
const missingPatients = [
  { pid: '20260100043', source: 'クレカ' },
  { pid: '20260100379', source: '銀行振込' },
  { pid: '20260100903', source: '銀行振込' },
  { pid: '20260100482', source: '銀行振込' },
];

async function investigate() {
  console.log('=== intakeテーブル抜け落ち調査 ===\n');
  console.log('対象患者: 4名（クレカ1名、銀行振込3名）\n');

  // 1. Supabase intakeテーブルで確認
  console.log('【1】Supabase intakeテーブルで確認');
  console.log('─'.repeat(60));

  const patientIds = missingPatients.map(p => p.pid);

  const { data: intakeData, error: intakeError } = await supabase
    .from('intake')
    .select('patient_id, patient_name, intake_status, reserved_date, created_at')
    .in('patient_id', patientIds);

  if (intakeError) {
    console.error('❌ Supabaseエラー:', intakeError.message);
  } else {
    console.log(`\n取得件数: ${intakeData?.length || 0}件\n`);

    if (intakeData && intakeData.length > 0) {
      intakeData.forEach((row, i) => {
        console.log(`${i + 1}. patient_id: ${row.patient_id}`);
        console.log(`   patient_name: "${row.patient_name}"`);
        console.log(`   intake_status: ${row.intake_status}`);
        console.log(`   reserved_date: ${row.reserved_date}`);
        console.log(`   created_at: ${row.created_at}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Supabaseのintakeテーブルにデータが存在しません\n');
    }

    // 存在しない患者IDを特定
    const foundIds = new Set((intakeData || []).map(r => r.patient_id));
    const missingIds = patientIds.filter(id => !foundIds.has(id));

    if (missingIds.length > 0) {
      console.log(`Supabaseに存在しない患者ID: ${missingIds.length}件`);
      missingIds.forEach((id, i) => {
        const source = missingPatients.find(p => p.pid === id)?.source;
        console.log(`  ${i + 1}. ${id} (${source})`);
      });
      console.log('');
    }
  }

  // 2. GAS問診シートで確認
  console.log('\n【2】GAS問診シートで確認');
  console.log('─'.repeat(60));

  const gasUrl = process.env.GAS_INTAKE_URL;
  if (!gasUrl) {
    console.log('⚠️ GAS_INTAKE_URL が設定されていません');
    console.log('   GASシートで手動確認が必要です\n');
    console.log('   確認方法:');
    console.log('   1. 問診シートを開く');
    console.log('   2. Z列（patient_id）で以下のIDを検索:');
    patientIds.forEach((id, i) => {
      const source = missingPatients.find(p => p.pid === id)?.source;
      console.log(`      ${i + 1}. ${id} (${source})`);
    });
    console.log('');
    return;
  }

  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'get_intake_by_patient_ids',
        patient_ids: patientIds,
      }),
    });

    if (!res.ok) {
      console.error(`❌ GAS API呼び出し失敗: ${res.status}`);
      const text = await res.text();
      console.error('   Response:', text);
      return;
    }

    const gasData = await res.json();
    console.log(`\n取得件数: ${gasData?.data?.length || 0}件\n`);

    if (gasData?.data && gasData.data.length > 0) {
      gasData.data.forEach((row, i) => {
        console.log(`${i + 1}. patient_id: ${row.patient_id}`);
        console.log(`   patient_name: "${row.patient_name}"`);
        console.log(`   intake_status: ${row.intake_status}`);
        console.log(`   reserved_date: ${row.reserved_date}`);
        console.log('');
      });
    } else {
      console.log('⚠️ GASシートにデータが存在しません\n');
    }

    // 存在しない患者IDを特定
    const gasFoundIds = new Set((gasData?.data || []).map(r => r.patient_id));
    const gasMissingIds = patientIds.filter(id => !gasFoundIds.has(id));

    if (gasMissingIds.length > 0) {
      console.log(`GASシートに存在しない患者ID: ${gasMissingIds.length}件`);
      gasMissingIds.forEach((id, i) => {
        const source = missingPatients.find(p => p.pid === id)?.source;
        console.log(`  ${i + 1}. ${id} (${source})`);
      });
      console.log('');
    }

  } catch (e) {
    console.error('❌ GAS APIエラー:', e.message);
  }

  // 3. 分析結果
  console.log('\n【3】分析結果');
  console.log('─'.repeat(60));
  console.log('');
  console.log('次のステップ:');
  console.log('1. Supabaseにもなく、GASにもない → 問診が登録されていない可能性');
  console.log('2. GASにあるが、Supabaseにない → 同期エラー');
  console.log('3. 両方にあるが、patient_nameが空 → データ入力ミス');
  console.log('');
}

investigate().catch(console.error);
