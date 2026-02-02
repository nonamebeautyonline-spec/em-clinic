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

// 商品価格マッピング
const PRODUCT_PRICES = {
  "MJL_2.5mg_1m": 13000,
  "MJL_2.5mg_2m": 25500,
  "MJL_2.5mg_3m": 35000,
  "MJL_5mg_1m": 22850,
  "MJL_5mg_2m": 45500,
  "MJL_5mg_3m": 63000,
  "MJL_7.5mg_1m": 34000,
  "MJL_7.5mg_2m": 65000,
  "MJL_7.5mg_3m": 94000,
  "MJL_10mg_1m": 35000,
  "MJL_10mg_2m": 70000,
  "MJL_10mg_3m": 105000,
};

const PRODUCT_NAMES = {
  "MJL_2.5mg_1m": "マンジャロ 2.5mg 1ヶ月",
  "MJL_2.5mg_2m": "マンジャロ 2.5mg 2ヶ月",
  "MJL_2.5mg_3m": "マンジャロ 2.5mg 3ヶ月",
  "MJL_5mg_1m": "マンジャロ 5mg 1ヶ月",
  "MJL_5mg_2m": "マンジャロ 5mg 2ヶ月",
  "MJL_5mg_3m": "マンジャロ 5mg 3ヶ月",
  "MJL_7.5mg_1m": "マンジャロ 7.5mg 1ヶ月",
  "MJL_7.5mg_2m": "マンジャロ 7.5mg 2ヶ月",
  "MJL_7.5mg_3m": "マンジャロ 7.5mg 3ヶ月",
  "MJL_10mg_1m": "マンジャロ 10mg 1ヶ月",
  "MJL_10mg_2m": "マンジャロ 10mg 2ヶ月",
  "MJL_10mg_3m": "マンジャロ 10mg 3ヶ月",
};

console.log('=== Fixing bank transfer order amounts ===\n');

try {
  // Get all bank_transfer orders with amount = 0 or null
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, product_code, amount, product_name')
    .eq('payment_method', 'bank_transfer')
    .or('amount.eq.0,amount.is.null');

  if (error) {
    console.error('❌ Error fetching orders:', error);
    process.exit(1);
  }

  console.log(`Found ${orders.length} bank transfer orders with amount = 0 or null\n`);

  if (orders.length === 0) {
    console.log('✅ No orders to fix');
    process.exit(0);
  }

  let fixed = 0;
  let skipped = 0;

  for (const order of orders) {
    const amount = PRODUCT_PRICES[order.product_code];
    const productName = PRODUCT_NAMES[order.product_code];

    if (!amount) {
      console.log(`⚠️ Skipped ${order.id}: Unknown product code ${order.product_code}`);
      skipped++;
      continue;
    }

    const updateData = { amount };
    if (!order.product_name || order.product_name === 'null') {
      updateData.product_name = productName;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id);

    if (updateError) {
      console.error(`❌ Failed to fix ${order.id}:`, updateError.message);
    } else {
      console.log(`✅ Fixed ${order.id}: ${order.product_code} → ¥${amount.toLocaleString()}`);
      fixed++;
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total: ${orders.length}`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
