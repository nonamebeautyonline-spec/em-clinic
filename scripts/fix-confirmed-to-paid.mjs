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

async function fix() {
  // 2/4以降のconfirmed状態の再処方を取得
  const { data: confirmedReorders, error } = await supabase
    .from('reorders')
    .select('id, gas_row_number, patient_id, product_code, status')
    .eq('status', 'confirmed')
    .gte('created_at', '2026-02-04')
    .order('gas_row_number', { ascending: false });

  if (error) {
    console.error('Error fetching reorders:', error);
    return;
  }

  console.log(`Found ${confirmedReorders?.length || 0} confirmed reorders since 2/4\n`);

  let fixedCount = 0;

  for (const r of confirmedReorders || []) {
    // この患者のordersを確認
    const { data: orders } = await supabase
      .from('orders')
      .select('id, product_code, created_at')
      .eq('patient_id', r.patient_id)
      .gte('created_at', '2026-02-03')
      .order('created_at', { ascending: false })
      .limit(1);

    if (orders && orders.length > 0) {
      // 決済済みの注文がある → paidに更新
      console.log(`#${r.gas_row_number} ${r.patient_id}: confirmed → paid (order: ${orders[0].id})`);
      
      const { error: updateError } = await supabase
        .from('reorders')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', r.id);

      if (updateError) {
        console.error(`  Error updating: ${updateError.message}`);
      } else {
        fixedCount++;
      }
    } else {
      console.log(`#${r.gas_row_number} ${r.patient_id}: still confirmed (no order yet)`);
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} reorders to 'paid'`);
}

fix();
