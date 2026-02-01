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
  console.log('=== 1/30 13:00（最新修正）以降の予約確認 ===\n');

  const gasUrl = process.env.GAS_MYPAGE_URL;
  const res = await fetch(gasUrl);
  const allData = await res.json();

  const fixTime = new Date('2026-01-30T04:00:00Z'); // JST 13:00 = UTC 04:00

  const afterFix = allData.filter(row => {
    const reserveId = row.reserveId || row.reserved;
    if (!reserveId || !reserveId.startsWith('resv-')) return false;

    const timestamp = parseInt(reserveId.replace('resv-', ''));
    const reserveCreatedAt = new Date(timestamp);
    return reserveCreatedAt > fixTime;
  });

  console.log('1/30 13:00以降に予約作成:', afterFix.length, '件\n');

  const { data: allIntake } = await supabase.from('intake').select('patient_id');
  const intakeIds = new Set(allIntake.map(r => r.patient_id));

  const missing = afterFix.filter(row => {
    const pid = row.Patient_ID || String(row.patient_id || '');
    return pid && !intakeIds.has(pid);
  });

  const synced = afterFix.length - missing.length;

  console.log('intakeに同期されている:', synced, '件');
  console.log('intakeに同期されていない:', missing.length, '件');
  console.log('成功率:', ((synced / afterFix.length) * 100).toFixed(1) + '%\n');

  if (missing.length === 0) {
    console.log('✅ 修正後は全て正常に同期されています！');
  } else {
    console.log('❌ 修正後もまだ一部失敗しています');
    console.log('\nサンプル（最初の5件）:');
    missing.slice(0, 5).forEach((row, i) => {
      const pid = row.Patient_ID || String(row.patient_id || '');
      const name = row.name || row['氏名'];
      const reserveId = row.reserveId || row.reserved;
      const timestamp = parseInt(reserveId.replace('resv-', ''));
      const reserveCreatedAt = new Date(timestamp);
      console.log((i + 1) + '. ' + pid + ' - ' + name);
      console.log('   予約作成: ' + reserveCreatedAt.toISOString());
    });
  }
}

check().catch(console.error);
