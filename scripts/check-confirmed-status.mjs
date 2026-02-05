import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 確認対象の患者ID（承認済み表示されているもの）
const patientIds = [
  '20251200216', '20260100913', '20251200682', '20260100038', 
  '20251200940', '20251200515', '20251200476', '20260100541',
  '20260100183', '20251200820', '20260100225', '20260100190',
  '20251200128', '20260100866', '20260100005', '20260101549',
  '20260100519'
];

async function check() {
  // reordersテーブルで確認（2/4以降）
  const { data: reorders, error } = await supabase
    .from('reorders')
    .select('gas_row_number, patient_id, product_code, status, created_at')
    .in('patient_id', patientIds)
    .gte('created_at', '2026-02-04')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== reorders table (status in DB) ===');
  const confirmedButShouldBePaid = [];
  
  for (const r of reorders || []) {
    const statusDisplay = r.status === 'paid' ? '✅決済済み' : 
                         r.status === 'confirmed' ? '⚠️承認済み' : r.status;
    console.log(`#${r.gas_row_number} | ${r.patient_id} | ${statusDisplay} | ${r.product_code}`);
    
    if (r.status === 'confirmed') {
      confirmedButShouldBePaid.push(r);
    }
  }

  // ordersテーブルで決済済みかどうか確認
  console.log('\n=== Checking if confirmed reorders have paid orders ===');
  for (const r of confirmedButShouldBePaid) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, patient_id, product_code, amount, created_at')
      .eq('patient_id', r.patient_id)
      .gte('created_at', '2026-02-03')
      .order('created_at', { ascending: false })
      .limit(3);

    if (orders && orders.length > 0) {
      console.log(`\n${r.patient_id} (reorder #${r.gas_row_number} = ${r.status}):`);
      for (const o of orders) {
        console.log(`  → order ${o.id}: ${o.product_code} ¥${o.amount} @ ${o.created_at.slice(0,16)}`);
      }
      console.log(`  ⚠️ Should be 'paid' because order exists!`);
    }
  }
}

check();
