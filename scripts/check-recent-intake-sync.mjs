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

async function checkRecentSync() {
  console.log('=== 1月1日以降のintake同期状況を確認 ===\n');

  // Supabaseで1月1日以降に作成されたintakeレコードを確認
  console.log('【1】Supabase intakeテーブル（1月1日以降作成）\n');

  const { data: recentIntakes, error: intakeError } = await supabase
    .from('intake')
    .select('patient_id, patient_name, status, created_at')
    .gte('created_at', '2026-01-01')
    .order('created_at', { ascending: true });

  if (intakeError) {
    console.error('エラー:', intakeError);
  } else {
    console.log(`1月1日以降に作成: ${recentIntakes.length}件\n`);

    // 日付別に集計
    const byDate = {};
    recentIntakes.forEach(row => {
      const date = row.created_at.split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });

    console.log('日付別:');
    Object.keys(byDate).sort().forEach(date => {
      console.log(`  ${date}: ${byDate[date]}件`);
    });
    console.log('');

    // 2/1（今日）以前のデータ
    const beforeToday = recentIntakes.filter(r => !r.created_at.startsWith('2026-02-01'));
    console.log(`2/1以前に作成されたデータ: ${beforeToday.length}件\n`);

    if (beforeToday.length > 0) {
      console.log('サンプル（最初の10件）:');
      beforeToday.slice(0, 10).forEach((row, i) => {
        console.log(`${i + 1}. ${row.patient_id} - ${row.patient_name} (${row.created_at})`);
      });
      console.log('');
    }
  }

  // GASシートで1月1日以降に送信された問診を確認
  console.log('\n【2】GAS問診シート（1月1日以降送信）\n');

  const gasUrl = process.env.GAS_MYPAGE_URL;
  if (!gasUrl) {
    console.error('❌ GAS_MYPAGE_URL が設定されていません');
    return;
  }

  const res = await fetch(`${gasUrl}`, { method: 'GET' });
  const allData = await res.json();

  // 1月1日以降の問診（timestamp基準）
  const jan1 = new Date('2026-01-01T00:00:00Z');
  const recentGAS = allData.filter(row => {
    const ts = new Date(row.timestamp || row.submittedAt);
    return ts >= jan1;
  });

  console.log(`1月1日以降に送信: ${recentGAS.length}件\n`);

  // 日付別に集計
  const gasByDate = {};
  recentGAS.forEach(row => {
    const ts = new Date(row.timestamp || row.submittedAt);
    const date = ts.toISOString().split('T')[0];
    gasByDate[date] = (gasByDate[date] || 0) + 1;
  });

  console.log('日付別:');
  Object.keys(gasByDate).sort().forEach(date => {
    console.log(`  ${date}: ${gasByDate[date]}件`);
  });
  console.log('');

  // 【3】同期されていない患者を確認
  console.log('\n【3】GASにあるがSupabaseにない患者（1月1日以降）\n');

  const supabaseIds = new Set((recentIntakes || []).map(r => r.patient_id));
  const missingInSupabase = recentGAS.filter(row => {
    const pidStr = row.Patient_ID || String(row.patient_id || '');
    return pidStr && !supabaseIds.has(pidStr);
  });

  console.log(`同期されていない患者: ${missingInSupabase.length}件\n`);

  if (missingInSupabase.length > 0) {
    console.log('詳細（最初の20件）:');
    missingInSupabase.slice(0, 20).forEach((row, i) => {
      const pidStr = row.Patient_ID || String(row.patient_id || '');
      console.log(`${i + 1}. ${pidStr} - ${row.name || row['氏名']} (送信: ${row.timestamp})`);
    });
    console.log('');

    if (missingInSupabase.length > 20) {
      console.log(`... 他 ${missingInSupabase.length - 20}件`);
    }
  } else {
    console.log('✅ 全ての患者が正常に同期されています');
  }

  // 【4】総件数比較
  console.log('\n【4】総件数比較\n');
  console.log(`GAS問診シート: ${allData.length}件`);

  const { count: totalSupabase } = await supabase
    .from('intake')
    .select('*', { count: 'exact', head: true });

  console.log(`Supabase intake: ${totalSupabase}件`);
  console.log(`差分: ${allData.length - totalSupabase}件`);
}

checkRecentSync().catch(console.error);
