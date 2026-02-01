#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('\n=== bank_transfer_orders テーブル確認 ===\n');

const { data, error } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('エラー:', error);
  process.exit(1);
}

console.log(`最新10件の銀行振込注文:\n`);

data.forEach((o, i) => {
  console.log(`${i + 1}. ID: ${o.id} | PID: ${o.patient_id} | 商品: ${o.product_code} | 作成: ${o.created_at}`);
  console.log(`   名義: ${o.account_name} | 住所: ${o.postal_code} ${o.address}`);
  console.log('');
});

console.log(`合計: ${data.length}件\n`);
