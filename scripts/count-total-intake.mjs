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

console.log('=== Counting total intake records ===\n');

// Count total records
const { count, error } = await supabase
  .from('intake')
  .select('*', { count: 'exact', head: true });

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log(`Total intake records: ${count}`);
console.log('');

if (count > 1000) {
  console.log('⚠️ WARNING: More than 1000 records!');
  console.log('Previous script only checked first 1000 records.');
  console.log(`Missing: ${count - 1000} records need to be checked.`);
}
