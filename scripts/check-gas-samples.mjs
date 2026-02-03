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
  console.log('=== GASにあり DB intakeにない 143件のサンプル確認 ===\n');

  // GASデータ
  const res = await fetch(gasUrl);
  const gasData = await res.json();
  const gasMap = new Map();
  gasData.forEach(row => {
    const pid = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
    if (pid && !pid.startsWith('TEST_')) {
      gasMap.set(pid, row);
    }
  });

  // DB intake
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
  intakeData.forEach(row => intakeMap.set(row.patient_id, row));

  // 不足リスト抽出
  const missing = [];
  gasMap.forEach((gasRow, pid) => {
    if (!gasRow.reserveId) return;
    const intake = intakeMap.get(pid);
    if (!intake || !intake.reserve_id) {
      missing.push({ pid, gas: gasRow });
    }
  });

  console.log('不足件数:', missing.length, '\n');

  // 10件サンプル
  const samples = missing.slice(0, 10);

  for (const s of samples) {
    console.log('【' + s.pid + '】');
    console.log('GAS:');
    console.log('  reserveId: ' + s.gas.reserveId);
    console.log('  date/time: ' + s.gas.reserved_date + ' ' + s.gas.reserved_time);
    console.log('  status: ' + (s.gas.status || '(空)'));
    console.log('  name: ' + (s.gas.name || s.gas['氏名'] || ''));

    // DB reservationsを確認
    const { data: reservations } = await supabase
      .from('reservations')
      .select('reserve_id, reserved_date, reserved_time, status')
      .eq('patient_id', s.pid)
      .order('reserved_date', { ascending: false });

    console.log('DB reservations:');
    if (reservations && reservations.length > 0) {
      reservations.forEach(r => {
        console.log('  ' + r.reserve_id + ' ' + r.reserved_date + ' ' + r.reserved_time + ' [' + (r.status || 'null') + ']');
      });
    } else {
      console.log('  なし');
    }
    console.log('');
  }
}

main().catch(console.error);
