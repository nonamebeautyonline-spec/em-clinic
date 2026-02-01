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

const problemPatients = ['20260100043', '20260100379', '20260100903', '20260100482'];

async function checkTimeline() {
  console.log('=== 4名の患者のタイムラインを確認 ===\n');

  const gasUrl = process.env.GAS_MYPAGE_URL;
  if (!gasUrl) {
    console.error('❌ GAS_MYPAGE_URL が設定されていません');
    return;
  }

  // GASから全データ取得
  const res = await fetch(`${gasUrl}`, { method: 'GET' });
  const allData = await res.json();

  // 4名のデータを抽出
  const targetData = allData.filter(row => {
    const pidStr = row.Patient_ID || String(row.patient_id || '');
    return problemPatients.includes(pidStr);
  });

  console.log('【GAS問診シートのデータ】\n');

  const backfillTime = new Date('2026-01-29T02:54:10Z');

  for (const row of targetData) {
    const pidStr = row.Patient_ID || String(row.patient_id || '');
    console.log(`患者ID: ${pidStr}`);
    console.log(`氏名: ${row.name || row['氏名']}`);
    console.log(`問診送信日時 (timestamp): ${row.timestamp}`);
    console.log(`問診送信日時 (submittedAt): ${row.submittedAt}`);

    // 予約ID確認
    const reserveId = row.reserveId || row.reserved;
    console.log(`予約ID (reserveId): ${reserveId || '（なし）'}`);

    if (reserveId && reserveId.startsWith('resv-')) {
      const timestamp = parseInt(reserveId.replace('resv-', ''));
      const reserveCreatedAt = new Date(timestamp);
      console.log(`予約作成時刻: ${reserveCreatedAt.toISOString()}`);

      if (reserveCreatedAt > backfillTime) {
        console.log(`  ✅ 1/29バックフィル後に予約作成`);
      } else {
        console.log(`  ❌ 1/29バックフィル前に予約作成`);
      }
    }

    console.log(`予約日 (reserved_date): ${row.reserved_date || row['予約日']}`);
    console.log(`予約時間: ${row.reserved_time || row['予約時間']}`);
    console.log(`ステータス: ${row.status}`);
    console.log('');
  }

  // ordersテーブルで決済日時を確認
  console.log('\n【ordersテーブルでの決済日時】\n');

  const { data: orders } = await supabase
    .from('orders')
    .select('patient_id, payment_method, paid_at, created_at')
    .in('patient_id', problemPatients)
    .order('paid_at', { ascending: true });

  if (orders && orders.length > 0) {
    orders.forEach((order, i) => {
      console.log(`${i + 1}. ${order.patient_id}`);
      console.log(`   決済方法: ${order.payment_method}`);
      console.log(`   決済日時 (paid_at): ${order.paid_at}`);
      console.log(`   作成日時 (created_at): ${order.created_at}`);
      console.log('');
    });
  }

  // intakeテーブルで作成日時を確認
  console.log('\n【Supabase intakeテーブルでの作成日時】\n');

  const { data: intakes } = await supabase
    .from('intake')
    .select('patient_id, patient_name, created_at, updated_at')
    .in('patient_id', problemPatients)
    .order('created_at', { ascending: true });

  if (intakes && intakes.length > 0) {
    intakes.forEach((intake, i) => {
      console.log(`${i + 1}. ${intake.patient_id}`);
      console.log(`   氏名: ${intake.patient_name}`);
      console.log(`   作成日時 (created_at): ${intake.created_at}`);
      console.log(`   更新日時 (updated_at): ${intake.updated_at}`);
      console.log('');
    });
  } else {
    console.log('（今日挿入したばかりなので、created_atは2026-02-01になっているはず）\n');
  }

  // タイムライン分析
  console.log('\n【タイムライン分析】\n');

  for (const pid of problemPatients) {
    const gasData = targetData.find(r => (r.Patient_ID || String(r.patient_id || '')) === pid);
    const orderData = orders?.find(o => o.patient_id === pid);
    const intakeData = intakes?.find(i => i.patient_id === pid);

    console.log(`患者ID: ${pid}`);
    console.log(`─`.repeat(60));

    if (gasData) {
      console.log(`問診送信: ${gasData.timestamp || gasData.submittedAt}`);
    }

    if (orderData) {
      console.log(`決済: ${orderData.paid_at}`);
    }

    if (intakeData) {
      console.log(`Supabase intake作成: ${intakeData.created_at}`);

      // 問診送信とSupabase作成の時差を計算
      if (gasData && gasData.timestamp) {
        const gasTime = new Date(gasData.timestamp);
        const supabaseTime = new Date(intakeData.created_at);
        const diffSeconds = (supabaseTime - gasTime) / 1000;

        if (diffSeconds < 60) {
          console.log(`✅ 同期遅延: ${diffSeconds.toFixed(1)}秒（正常）`);
        } else if (diffSeconds < 3600) {
          console.log(`⚠️ 同期遅延: ${(diffSeconds / 60).toFixed(1)}分`);
        } else if (diffSeconds < 86400) {
          console.log(`⚠️ 同期遅延: ${(diffSeconds / 3600).toFixed(1)}時間`);
        } else {
          console.log(`❌ 同期遅延: ${(diffSeconds / 86400).toFixed(1)}日`);
        }
      }
    } else {
      console.log(`❌ Supabase intakeに存在しない（今日手動で挿入するまで同期されていなかった）`);
    }

    console.log('');
  }
}

checkTimeline().catch(console.error);
