#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const oldPatientId = '20251200193';
const newPatientId = '20260101648';

async function checkOrders() {
  console.log('\n=== Orders確認 ===\n');

  // 旧患者のorders
  console.log(`[旧患者 ${oldPatientId}] orders:`);
  const { data: oldOrders, error: oldError } = await supabase
    .from('orders')
    .select('*')
    .eq('patient_id', oldPatientId);

  if (oldError) {
    console.error('エラー:', oldError);
  } else {
    console.log('件数:', oldOrders?.length || 0);
    if (oldOrders && oldOrders.length > 0) {
      console.log('データ:', JSON.stringify(oldOrders, null, 2));
    }
  }

  // 新患者のorders
  console.log(`\n[新患者 ${newPatientId}] orders:`);
  const { data: newOrders, error: newError } = await supabase
    .from('orders')
    .select('*')
    .eq('patient_id', newPatientId);

  if (newError) {
    console.error('エラー:', newError);
  } else {
    console.log('件数:', newOrders?.length || 0);
    if (newOrders && newOrders.length > 0) {
      console.log('データ:', JSON.stringify(newOrders, null, 2));
    }
  }

  console.log('\n=== 確認完了 ===\n');
}

checkOrders().catch(console.error);
