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

console.log('=== 銀行振込テスト送信 ===\n');

const testData = {
  patientId: "TEST_SUBMIT_" + Date.now(),
  productCode: "tirzepatide-2.5mg-1",
  mode: "first",
  reorderId: null,
  accountName: "テスト送信太郎",
  phoneNumber: "090-9999-8888",
  email: "test-submit@example.com",
  postalCode: "100-0001",
  address: "東京都千代田区テスト町1-2-3",
};

console.log('送信データ:', JSON.stringify(testData, null, 2));
console.log('\nNext.js APIに送信中...\n');

try {
  const response = await fetch('http://localhost:3000/api/bank-transfer/shipping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData),
  });

  const status = response.status;
  const result = await response.json();

  console.log(`Status: ${status}`);
  console.log(`Response:`, result);

  if (status === 200) {
    console.log('\n✅ Next.js API: 成功');

    // 3秒待ってDBを確認
    console.log('\n3秒待機してDBを確認...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // DBを確認
    const { data: dbData, error: dbError } = await supabase
      .from('bank_transfer_orders')
      .select('*')
      .eq('patient_id', testData.patientId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (dbError) {
      console.error('\n❌ DB確認エラー:', dbError.message);
    } else if (dbData && dbData.length > 0) {
      console.log('\n✅ Supabase DB: データ確認');
      console.log('   ID:', dbData[0].id);
      console.log('   Patient ID:', dbData[0].patient_id);
      console.log('   Account Name:', dbData[0].account_name);
      console.log('   Address:', dbData[0].address);
    } else {
      console.log('\n❌ Supabase DB: データが見つかりません');
    }

    console.log('\n📋 GASシート確認: 銀行振込管理シートの「2026-01 住所情報」タブを確認してください');
    console.log('   患者ID:', testData.patientId);
    console.log('   口座名義:', testData.accountName);
  } else {
    console.log('\n❌ Next.js API: 失敗');
  }
} catch (e) {
  console.error('\n❌ エラー:', e.message);
  process.exit(1);
}
