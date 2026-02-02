import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match && match[1] && match[2]) {
    const key = match[1].trim();
    let value = match[2].trim();
    value = value.replace(/^"/, '').replace(/"$/, '');
    env[key] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('=== Checking answerer 232705789 (patient 20260100756) ===\n');

const { data, error } = await supabase
  .from('answerers')
  .select('*')
  .eq('answerer_id', '232705789');

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log(`Found ${data.length} records:\n`);

for (let i = 0; i < data.length; i++) {
  console.log(`--- Record ${i + 1} ---`);
  console.log('  tel:', data[i].tel || 'MISSING');
  console.log('  name_kana:', data[i].name_kana || 'MISSING');
  console.log('  name:', data[i].name || 'MISSING');
  console.log('  created_at:', data[i].created_at);
  console.log('');
}

console.log('=== Solution ===');
if (data.length > 0) {
  const first = data[0];
  console.log('Use first record:');
  console.log('  tel:', first.tel);
  console.log('  name_kana:', first.name_kana);
}
