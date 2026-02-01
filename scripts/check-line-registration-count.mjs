import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

console.log('=== LINE登録者数の確認 ===\n');

// Check LINE user count
const { count, error } = await supabase
  .from('intake')
  .select('*', { count: 'exact', head: true })
  .not('line_user_id', 'is', null);

if (error) {
  console.error('エラー:', error);
} else {
  console.log('LINE登録者数:', count);
}

// Sample data
const { data: samples } = await supabase
  .from('intake')
  .select('patient_id, line_user_id')
  .not('line_user_id', 'is', null)
  .limit(5);

console.log('\nサンプル:');
samples?.forEach(s => {
  console.log(`  患者ID: ${s.patient_id}, LINE ID: ${s.line_user_id}`);
});

// Check how many have null line_user_id
const { count: nullCount } = await supabase
  .from('intake')
  .select('*', { count: 'exact', head: true })
  .is('line_user_id', null);

console.log(`\nLINE未登録: ${nullCount}人`);
