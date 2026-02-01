#!/usr/bin/env node
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

const gasUrl = envVars.GAS_BANK_TRANSFER_URL;

if (!gasUrl) {
  console.error('❌ GAS_BANK_TRANSFER_URL not found in .env.local');
  process.exit(1);
}

console.log('=== Testing Bank Transfer GAS ===\n');
console.log('GAS URL:', gasUrl);

const testPayload = {
  type: "bank_transfer_order",
  order_id: "9999",
  patient_id: "TEST_GAS_20260131",
  product_code: "tirzepatide-2.5mg-1",
  mode: "first",
  reorder_id: null,
  account_name: "テストタロウ",
  phone_number: "090-1234-5678",
  email: "test@example.com",
  postal_code: "123-4567",
  address: "東京都渋谷区テスト1-2-3",
  submitted_at: new Date().toISOString()
};

console.log('\nPayload:', JSON.stringify(testPayload, null, 2));
console.log('\nCalling GAS...\n');

try {
  const response = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload),
  });

  const status = response.status;
  const text = await response.text();

  console.log(`Status: ${status}`);
  console.log(`Response: ${text}`);

  if (status === 200) {
    console.log('\n✅ GAS call succeeded');
  } else {
    console.log('\n❌ GAS call failed');
  }
} catch (e) {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
}
