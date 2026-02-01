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

async function check() {
  console.log('=== 1/29以降に予約した人のintake同期確認 ===\n');

  const gasUrl = process.env.GAS_MYPAGE_URL;
  const res = await fetch(gasUrl);
  const allData = await res.json();

  const backfillTime = new Date('2026-01-29T02:54:10Z');

  // 1/29以降に予約作成した人を抽出
  const postBackfillReservations = allData.filter(row => {
    const reserveId = row.reserveId || row.reserved;
    if (!reserveId || !reserveId.startsWith('resv-')) return false;

    const timestamp = parseInt(reserveId.replace('resv-', ''));
    const reserveCreatedAt = new Date(timestamp);
    return reserveCreatedAt > backfillTime;
  });

  console.log('1/29バックフィル後に予約作成:', postBackfillReservations.length, '件\n');

  // Supabaseから全patient_id取得
  const { data: allIntake } = await supabase
    .from('intake')
    .select('patient_id');

  const intakeIds = new Set(allIntake.map(r => r.patient_id));

  // intakeに存在しない人
  const missingInIntake = postBackfillReservations.filter(row => {
    const pid = row.Patient_ID || String(row.patient_id || '');
    return pid && !intakeIds.has(pid);
  });

  console.log('intakeに同期されていない:', missingInIntake.length, '件\n');

  if (missingInIntake.length > 0) {
    console.log('❌ 1/29以降も予約時のintake同期が失敗しています\n');
    console.log('サンプル（最初の10件）:');
    missingInIntake.slice(0, 10).forEach((row, i) => {
      const pid = row.Patient_ID || String(row.patient_id || '');
      const reserveId = row.reserveId || row.reserved;
      const timestamp = parseInt(reserveId.replace('resv-', ''));
      const reserveCreatedAt = new Date(timestamp);
      const name = row.name || row['氏名'];
      console.log(i + 1 + '. ' + pid + ' - ' + name);
      console.log('   予約作成時刻: ' + reserveCreatedAt.toISOString());
    });
  } else {
    console.log('✅ 1/29以降に予約した人は全てintakeに正しく同期されています');
  }
}

check().catch(console.error);
