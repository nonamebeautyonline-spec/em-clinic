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

async function checkDiff() {
  console.log('=== intake vs reservations の2/2差分確認 ===\n');

  // intakeテーブルから2/2を取得
  const { data: intake0202, count: intakeCount } = await supabase
    .from('intake')
    .select('patient_id, patient_name, reserved_date, reserved_time, reserve_id, status', { count: 'exact' })
    .eq('reserved_date', '2026-02-02')
    .order('patient_id', { ascending: true });

  console.log(`intake（reserved_date='2026-02-02'）: ${intakeCount}件\n`);

  // reservationsテーブルから2/2（キャンセル除外）を取得
  const { data: reservations0202, count: reservationsCount } = await supabase
    .from('reservations')
    .select('patient_id, patient_name, reserved_date, status, reserve_id', { count: 'exact' })
    .eq('reserved_date', '2026-02-02')
    .neq('status', 'canceled')
    .order('patient_id', { ascending: true });

  console.log(`reservations（reserved_date='2026-02-02' かつ status!='canceled'）: ${reservationsCount}件\n`);

  const reservationsPidSet = new Set(reservations0202.map(r => r.patient_id));

  // intakeにあり、reservations（キャンセル除外）にない患者
  const inIntakeNotInActiveReservations = intake0202.filter(i => !reservationsPidSet.has(i.patient_id));

  console.log('=== intakeにあり、reservations（有効予約）にない ===');
  console.log(`件数: ${inIntakeNotInActiveReservations.length}件\n`);

  if (inIntakeNotInActiveReservations.length > 0) {
    for (const i of inIntakeNotInActiveReservations) {
      console.log(`患者ID: ${i.patient_id}`);
      console.log(`  氏名: ${i.patient_name}`);
      console.log(`  intake reserved_date: ${i.reserved_date} ${i.reserved_time}`);
      console.log(`  intake reserve_id: ${i.reserve_id}`);
      console.log(`  intake status: ${i.status}`);

      // この患者の全予約を確認
      const { data: allReservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('patient_id', i.patient_id)
        .order('created_at', { ascending: true });

      console.log(`  reservations総数: ${allReservations ? allReservations.length : 0}件`);

      if (allReservations && allReservations.length > 0) {
        allReservations.forEach((res, idx) => {
          console.log(`    [${idx+1}] ${res.reserve_id}`);
          console.log(`        予約日: ${res.reserved_date} ${res.reserved_time}`);
          console.log(`        status: ${res.status}`);
          console.log(`        作成: ${res.created_at}`);
        });
      }
      console.log('');
    }
  }
}

checkDiff().catch(console.error);
