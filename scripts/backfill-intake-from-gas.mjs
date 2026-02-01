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

async function backfillIntake() {
  console.log('=== GAS問診シートからSupabase intakeテーブルへ全件バックフィル ===\n');

  const gasUrl = process.env.GAS_MYPAGE_URL || process.env.GAS_INTAKE_LIST_URL;
  const adminToken = process.env.ADMIN_TOKEN;

  if (!gasUrl) {
    console.error('❌ GAS_MYPAGE_URL または GAS_INTAKE_LIST_URL が設定されていません');
    return;
  }

  if (!adminToken) {
    console.error('❌ ADMIN_TOKEN が設定されていません');
    return;
  }

  console.log(`使用するGAS URL: ${gasUrl}\n`);

  console.log('【1】GAS backfill_all_intake API を呼び出し中...');
  console.log('    ※ GAS側で全intakeデータをSupabaseに同期します\n');

  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'backfill_all_intake',
        token: adminToken,
      }),
    });

    if (!res.ok) {
      console.error(`❌ GAS API呼び出し失敗: ${res.status}`);
      const text = await res.text();
      console.error('Response:', text);
      return;
    }

    const result = await res.json();
    console.log('GAS API Response:', result);

    if (!result.ok) {
      console.error('❌ GAS APIエラー:', result.error || result);
      return;
    }

    console.log('✅ GAS側でバックフィルが開始されました');
    console.log('   処理完了まで待機中...\n');

    // GAS側の処理完了を待つ（30秒待機）
    console.log('   ※ GAS側での処理時間: 約20-30秒');
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log('\n【2】バックフィル完了確認');

    console.log('─'.repeat(60));

    const { count: finalCount } = await supabase
      .from('intake')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Supabase intakeテーブル総件数: ${finalCount}件\n`);

    // 問題の4名を確認
    console.log('【3】問題の4名を確認');
    console.log('─'.repeat(60));
    const problemPatients = [
      { pid: '20260100043', source: 'クレカ' },
      { pid: '20260100379', source: '銀行振込' },
      { pid: '20260100903', source: '銀行振込' },
      { pid: '20260100482', source: '銀行振込' },
    ];

    const patientIds = problemPatients.map(p => p.pid);

    const { data: checkData } = await supabase
      .from('intake')
      .select('patient_id, patient_name, status')
      .in('patient_id', patientIds);

    if (checkData && checkData.length > 0) {
      console.log(`✅ ${checkData.length}/4件がintakeに存在します:\n`);
      checkData.forEach((row, i) => {
        const source = problemPatients.find(p => p.pid === row.patient_id)?.source;
        console.log(`${i + 1}. ${source} - ${row.patient_id}`);
        console.log(`   氏名: "${row.patient_name}"`);
        console.log(`   ステータス: ${row.status}`);
        console.log('');
      });
    }

    const foundIds = new Set((checkData || []).map(r => r.patient_id));
    const stillMissing = problemPatients.filter(p => !foundIds.has(p.pid));

    if (stillMissing.length > 0) {
      console.log('⚠️ まだintakeに存在しない患者:');
      stillMissing.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.source} - ${p.pid}`);
      });
      console.log('\n⚠️ これらの患者はGAS問診シートにも存在しない可能性があります');
    } else {
      console.log('🎉 全4名がintakeテーブルに正常に同期されました！');
    }

  } catch (e) {
    console.error('❌ エラー:', e.message);
  }
}

backfillIntake().catch(console.error);
