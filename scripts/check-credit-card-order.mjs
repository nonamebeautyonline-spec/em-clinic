#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const orderId = process.argv[2] || 'ZcAwiwymxuMz7KsHtQ7POzPyKqKZY';

console.log(`=== 注文詳細: ${orderId} ===\n`);

const { data, error } = await supabase
  .from('orders')
  .select('*')
  .eq('id', orderId)
  .single();

if (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

console.log('全カラム:');
Object.entries(data).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});
