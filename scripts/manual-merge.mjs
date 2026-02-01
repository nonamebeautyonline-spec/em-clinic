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

async function mergeSupabase() {
  console.log(`\n=== Supabase統合開始: ${oldPatientId} → ${newPatientId} ===\n`);

  // intake
  console.log('[intake] 更新中...');
  const { error: intakeError } = await supabase
    .from('intake')
    .update({ patient_id: newPatientId })
    .eq('patient_id', oldPatientId);

  if (intakeError) {
    console.error('[intake] エラー:', intakeError);
  } else {
    console.log('[intake] ✅ 完了');
  }

  // orders
  console.log('[orders] 更新中...');
  const { error: ordersError } = await supabase
    .from('orders')
    .update({ patient_id: newPatientId })
    .eq('patient_id', oldPatientId);

  if (ordersError) {
    console.error('[orders] エラー:', ordersError);
  } else {
    console.log('[orders] ✅ 完了');
  }

  // reservations
  console.log('[reservations] 更新中...');
  const { error: reservationsError } = await supabase
    .from('reservations')
    .update({ patient_id: newPatientId })
    .eq('patient_id', oldPatientId);

  if (reservationsError) {
    console.error('[reservations] エラー:', reservationsError);
  } else {
    console.log('[reservations] ✅ 完了');
  }

  console.log('\n=== Supabase統合完了 ===\n');
}

mergeSupabase().catch(console.error);
