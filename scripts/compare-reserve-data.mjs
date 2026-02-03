import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) {
    let val = vals.join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key.trim()] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const gasUrl = env.GAS_MYPAGE_URL;

async function main() {
  console.log('=== 予約データ 3者比較 ===\n');

  // 1. GAS intakeデータ
  const res = await fetch(gasUrl);
  const gasData = await res.json();
  const gasMap = new Map();
  gasData.forEach(row => {
    const pid = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
    if (pid && !pid.startsWith('TEST_')) {
      gasMap.set(pid, {
        reserveId: row.reserveId || '',
        reserved_date: row.reserved_date || '',
        reserved_time: row.reserved_time || ''
      });
    }
  });

  // 2. DB intakeデータ（ページネーション）
  let intakeData = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from('intake')
      .select('patient_id, reserve_id, reserved_date, reserved_time')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    intakeData = intakeData.concat(data);
    if (data.length < 1000) break;
    page++;
  }
  const intakeMap = new Map();
  intakeData.forEach(row => {
    intakeMap.set(row.patient_id, {
      reserveId: row.reserve_id || '',
      reserved_date: row.reserved_date || '',
      reserved_time: row.reserved_time || ''
    });
  });

  // 3. DB reservationsデータ（最新の有効予約のみ）
  let reservations = [];
  page = 0;
  while (true) {
    const { data } = await supabase
      .from('reservations')
      .select('patient_id, reserve_id, reserved_date, reserved_time, status')
      .neq('status', 'canceled')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    reservations = reservations.concat(data);
    if (data.length < 1000) break;
    page++;
  }
  // patient_idごとに最新の予約を取得
  const reserveMap = new Map();
  reservations.forEach(row => {
    const existing = reserveMap.get(row.patient_id);
    if (!existing || row.reserved_date > existing.reserved_date) {
      reserveMap.set(row.patient_id, {
        reserveId: row.reserve_id || '',
        reserved_date: row.reserved_date || '',
        reserved_time: row.reserved_time || '',
        status: row.status || ''
      });
    }
  });

  console.log('GAS intake:', gasMap.size, '件');
  console.log('DB intake:', intakeMap.size, '件');
  console.log('DB reservations(有効):', reserveMap.size, '件\n');

  // 比較
  let gasOnly = 0;
  let intakeOnly = 0;
  let allMatch = 0;
  let gasDiffIntake = 0;
  let gasDiffReserve = 0;
  let intakeDiffReserve = 0;
  
  const samples = { gasOnly: [], intakeOnly: [], gasDiffIntake: [], gasDiffReserve: [] };

  // GASにあるpatient_idを基準にチェック
  gasMap.forEach((gasVal, pid) => {
    const intakeVal = intakeMap.get(pid);
    const reserveVal = reserveMap.get(pid);

    if (!gasVal.reserveId) return; // GASに予約なし

    if (!intakeVal || !intakeVal.reserveId) {
      // DB intakeに予約情報なし
      if (samples.gasOnly.length < 5) {
        samples.gasOnly.push({ pid, gas: gasVal, reserve: reserveVal });
      }
      gasOnly++;
    } else if (gasVal.reserveId !== intakeVal.reserveId) {
      // GASとDB intakeで予約IDが異なる
      if (samples.gasDiffIntake.length < 5) {
        samples.gasDiffIntake.push({ pid, gas: gasVal, intake: intakeVal, reserve: reserveVal });
      }
      gasDiffIntake++;
    } else {
      allMatch++;
    }

    // GASとreservationsの比較
    if (reserveVal && gasVal.reserveId !== reserveVal.reserveId) {
      if (samples.gasDiffReserve.length < 5) {
        samples.gasDiffReserve.push({ pid, gas: gasVal, reserve: reserveVal });
      }
      gasDiffReserve++;
    }
  });

  // DB intakeにあってGASにない
  intakeMap.forEach((intakeVal, pid) => {
    if (!intakeVal.reserveId) return;
    const gasVal = gasMap.get(pid);
    if (!gasVal || !gasVal.reserveId) {
      intakeOnly++;
    }
  });

  console.log('=== 比較結果 ===\n');
  console.log('GAS↔DB intake 一致:', allMatch, '件');
  console.log('GASにあり、DB intakeにない:', gasOnly, '件');
  console.log('DB intakeにあり、GASにない:', intakeOnly, '件');
  console.log('GAS↔DB intake 予約ID不一致:', gasDiffIntake, '件');
  console.log('GAS↔DB reservations 予約ID不一致:', gasDiffReserve, '件');

  if (samples.gasOnly.length > 0) {
    console.log('\n【サンプル: GASにありDB intakeにない】');
    samples.gasOnly.forEach((s, i) => {
      console.log((i+1) + '. ' + s.pid);
      console.log('   GAS: ' + s.gas.reserveId + ' ' + s.gas.reserved_date + ' ' + s.gas.reserved_time);
      if (s.reserve) {
        console.log('   reservations: ' + s.reserve.reserveId + ' ' + s.reserve.reserved_date);
      } else {
        console.log('   reservations: なし');
      }
    });
  }

  if (samples.gasDiffIntake.length > 0) {
    console.log('\n【サンプル: GAS↔DB intake予約ID不一致】');
    samples.gasDiffIntake.forEach((s, i) => {
      console.log((i+1) + '. ' + s.pid);
      console.log('   GAS: ' + s.gas.reserveId + ' ' + s.gas.reserved_date);
      console.log('   DB intake: ' + s.intake.reserveId + ' ' + s.intake.reserved_date);
      if (s.reserve) {
        console.log('   reservations: ' + s.reserve.reserveId + ' ' + s.reserve.reserved_date);
      }
    });
  }
}

main().catch(console.error);
