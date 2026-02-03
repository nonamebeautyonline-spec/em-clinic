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

const pids = ['20260100044', '20260100621', '20260100644', '20260100446', '20260100576'];

async function main() {
  console.log('=== 予約ID不一致 5件の詳細 ===\n');

  // GASデータ
  const res = await fetch(gasUrl);
  const gasData = await res.json();
  const gasMap = new Map();
  gasData.forEach(row => {
    const pid = String(row.Patient_ID || row.patient_id || '').replace('.0', '').trim();
    if (pid) gasMap.set(pid, row);
  });

  for (const pid of pids) {
    console.log('【' + pid + '】');
    
    const gas = gasMap.get(pid);
    if (gas) {
      console.log('GAS:');
      console.log('  reserveId: ' + gas.reserveId);
      console.log('  date: ' + gas.reserved_date + ' ' + gas.reserved_time);
      console.log('  status: ' + (gas.status || '(空)'));
    }

    // DB intake
    const { data: intake } = await supabase
      .from('intake')
      .select('reserve_id, reserved_date, reserved_time')
      .eq('patient_id', pid)
      .single();

    console.log('DB intake:');
    if (intake && intake.reserve_id) {
      console.log('  reserve_id: ' + intake.reserve_id);
      console.log('  date: ' + intake.reserved_date + ' ' + intake.reserved_time);
    } else {
      console.log('  (なし)');
    }

    // DB reservations 全件
    const { data: reservations } = await supabase
      .from('reservations')
      .select('reserve_id, reserved_date, reserved_time, status, created_at')
      .eq('patient_id', pid)
      .order('created_at', { ascending: false });

    console.log('DB reservations:');
    if (reservations && reservations.length > 0) {
      reservations.forEach(r => {
        const marker = r.reserve_id === intake?.reserve_id ? ' ← intake' : 
                       r.reserve_id === gas?.reserveId ? ' ← GAS' : '';
        console.log('  ' + r.reserve_id + ' ' + r.reserved_date + ' [' + (r.status || 'null') + ']' + marker);
      });
    }
    console.log('');
  }
}

main().catch(console.error);
