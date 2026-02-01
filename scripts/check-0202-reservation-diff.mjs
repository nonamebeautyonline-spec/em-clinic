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
  console.log('=== 2/2予約の差分確認 ===\n');

  // GAS APIから取得
  const gasUrl = process.env.GAS_MYPAGE_URL;
  const res = await fetch(gasUrl);
  const gasData = await res.json();

  // 2/2の予約を抽出（キャンセル除外）
  const gas0202 = gasData.filter(row => {
    const reservedDate = row.reserved_date || row['予約日'] || '';
    const status = row.reserve_status || row.status || '';
    return reservedDate === '2026-02-02' && status !== 'キャンセル' && status !== 'canceled';
  });

  console.log(`GAS（キャンセル除外）: ${gas0202.length}件\n`);

  // Supabaseから2/2の予約を取得（キャンセル除外）
  const { data: supabase0202, count } = await supabase
    .from('reservations')
    .select('patient_id, patient_name, reserved_date, status', { count: 'exact' })
    .eq('reserved_date', '2026-02-02')
    .neq('status', 'canceled')
    .order('patient_id', { ascending: true });

  console.log(`Supabase（キャンセル除外）: ${count}件\n`);

  // patient_idのセットを作成
  const gasSet = new Set(gas0202.map(row => {
    const pid = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
    return pid;
  }));

  const supabaseSet = new Set(supabase0202.map(r => r.patient_id));

  // Supabaseにあり、GASにない患者
  const inSupabaseNotInGas = supabase0202.filter(r => !gasSet.has(r.patient_id));

  // GASにあり、Supabaseにない患者
  const inGasNotInSupabase = gas0202.filter(row => {
    const pid = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
    return !supabaseSet.has(pid);
  });

  console.log('=== Supabaseにあり、GASにない ===');
  console.log(`件数: ${inSupabaseNotInGas.length}件\n`);

  if (inSupabaseNotInGas.length > 0) {
    inSupabaseNotInGas.forEach((r, i) => {
      console.log(`${i+1}. ${r.patient_id} - ${r.patient_name} (status: ${r.status})`);
    });
  }

  console.log('\n=== GASにあり、Supabaseにない ===');
  console.log(`件数: ${inGasNotInSupabase.length}件\n`);

  if (inGasNotInSupabase.length > 0) {
    inGasNotInSupabase.forEach((row, i) => {
      const pid = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
      const name = row.name || row['氏名'] || '';
      const status = row.reserve_status || row.status || '';
      const reserveId = row.reserveId || row.reserve_id || '';
      console.log(`${i+1}. ${pid} - ${name}`);
      console.log(`    GAS reserve_status: ${status}, reserve_id: ${reserveId}`);
    });
  }

  // 詳細：Supabaseにあり、GASにない患者の詳細
  if (inSupabaseNotInGas.length > 0) {
    console.log('\n=== 詳細: Supabaseにあり、GASにない患者 ===\n');

    for (const r of inSupabaseNotInGas) {
      console.log(`患者ID: ${r.patient_id}`);
      console.log(`  氏名: ${r.patient_name}`);
      console.log(`  status: ${r.status}`);

      // この患者の全予約を確認
      const { data: allReservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('patient_id', r.patient_id)
        .order('created_at', { ascending: true });

      console.log(`  予約総数: ${allReservations ? allReservations.length : 0}件`);

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

  // 詳細：GASにあり、Supabaseにない患者の詳細
  if (inGasNotInSupabase.length > 0) {
    console.log('\n=== 詳細: GASにあり、Supabaseにない患者 ===\n');

    for (const row of inGasNotInSupabase) {
      const pid = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
      const name = row.name || row['氏名'] || '';

      console.log(`患者ID: ${pid}`);
      console.log(`  GAS氏名: ${name}`);

      // Supabaseでこの患者の全予約を確認
      const { data: allReservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('patient_id', pid)
        .order('created_at', { ascending: true });

      console.log(`  Supabase予約総数: ${allReservations ? allReservations.length : 0}件`);

      if (allReservations && allReservations.length > 0) {
        allReservations.forEach((res, idx) => {
          console.log(`    [${idx+1}] ${res.reserve_id}`);
          console.log(`        予約日: ${res.reserved_date} ${res.reserved_time}`);
          console.log(`        status: ${res.status}`);
          console.log(`        作成: ${res.created_at}`);
        });
      } else {
        console.log('  ⚠️ Supabaseに予約が全く存在しない');
      }
      console.log('');
    }
  }
}

checkDiff().catch(console.error);
