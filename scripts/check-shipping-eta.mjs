#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('\n=== orders テーブルの全カラム確認 ===\n');
  
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('patient_id', '20260101648')
    .limit(1);

  if (error) {
    console.error('エラー:', error);
  } else if (data && data.length > 0) {
    console.log('カラム一覧:');
    Object.keys(data[0]).sort().forEach(key => {
      const val = data[0][key];
      const preview = val ? String(val).slice(0, 50) : '(null)';
      console.log(`  ${key}: ${preview}`);
    });
  } else {
    console.log('データなし');
  }
}

checkSchema().catch(console.error);
