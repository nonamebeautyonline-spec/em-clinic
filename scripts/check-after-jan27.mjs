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
  console.log('=== 1/27以降の問診同期状況 ===\n');

  const gasUrl = process.env.GAS_MYPAGE_URL;
  const res = await fetch(gasUrl);
  const allGAS = await res.json();

  const jan27 = new Date('2026-01-27T00:00:00Z');
  const after27 = allGAS.filter(row => {
    const ts = new Date(row.timestamp || row.submittedAt);
    return ts >= jan27;
  });

  console.log('GAS問診（1/27以降）:', after27.length, '件\n');

  const { data: allSupabase } = await supabase.from('intake').select('patient_id');
  const supabaseIds = new Set(allSupabase.map(r => r.patient_id));

  const missing = after27.filter(row => {
    const pid = row.Patient_ID || String(row.patient_id || '');
    return pid && !supabaseIds.has(pid);
  });

  console.log('Supabaseに未同期:', missing.length, '件\n');

  if (missing.length > 0) {
    console.log('未同期の内訳（日付別）:');
    const byDate = {};
    missing.forEach(row => {
      const ts = new Date(row.timestamp || row.submittedAt);
      const date = ts.toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });
    Object.keys(byDate).sort().forEach(date => {
      console.log(' ', date, ':', byDate[date], '件');
    });
  } else {
    console.log('✅ 全て同期済み');
  }
}

check().catch(console.error);
