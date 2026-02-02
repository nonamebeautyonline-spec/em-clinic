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

console.log('=== Fixing phone numbers in orders table ===\n');

function normalizePhone(phone) {
  if (!phone) return phone;

  let digits = phone.replace(/[^\d]/g, '');
  if (!digits) return phone;

  // 0080 → 080, 0090 → 090
  if (digits.startsWith('0080')) {
    return '080' + digits.slice(4);
  } else if (digits.startsWith('0090')) {
    return '090' + digits.slice(4);
  }

  return phone; // 変更不要
}

try {
  // Get all orders with phone numbers starting with 0080 or 0090
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, phone')
    .not('phone', 'is', null);

  if (error) {
    console.error('❌ Error fetching orders:', error);
    process.exit(1);
  }

  console.log(`Found ${orders.length} orders with phone numbers\n`);

  const toFix = orders.filter(o => {
    const digits = o.phone.replace(/[^\d]/g, '');
    return digits.startsWith('0080') || digits.startsWith('0090');
  });

  console.log(`Found ${toFix.length} orders with 0080/0090 phone numbers:\n`);

  if (toFix.length === 0) {
    console.log('✅ No phone numbers to fix');
    process.exit(0);
  }

  toFix.forEach(o => {
    console.log(`  ${o.id}: ${o.phone} → ${normalizePhone(o.phone)}`);
  });

  console.log('\nFixing phone numbers...\n');

  let fixed = 0;
  for (const order of toFix) {
    const newPhone = normalizePhone(order.phone);

    const { error: updateError } = await supabase
      .from('orders')
      .update({ phone: newPhone })
      .eq('id', order.id);

    if (updateError) {
      console.error(`❌ Failed to fix ${order.id}:`, updateError.message);
    } else {
      console.log(`✅ Fixed ${order.id}: ${order.phone} → ${newPhone}`);
      fixed++;
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Fixed ${fixed}/${toFix.length} phone numbers`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
