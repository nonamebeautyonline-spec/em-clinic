import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envPath = '/Users/administer/em-clinic/.env.local';
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
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  console.log('=== 銀行振込データ確認 ===\n');

  // 全件取得
  const { data: allOrders, error } = await supabase
    .from('bank_transfer_orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log(`総件数: ${allOrders.length}\n`);

  // テストデータの可能性があるものを検出
  const testPatterns = [
    'test',
    'テスト',
    '試験',
    'TEST',
    'dummy',
    'ダミー',
    '20251200128',
    '999',
    'sample'
  ];

  const suspiciousOrders = allOrders.filter(order => {
    const checkFields = [
      order.patient_id,
      order.account_name,
      order.phone_number,
      order.email,
      order.address,
      order.notes
    ].map(v => String(v || '').toLowerCase());

    return checkFields.some(field =>
      testPatterns.some(pattern => field.includes(pattern.toLowerCase()))
    );
  });

  if (suspiciousOrders.length > 0) {
    console.log(`\n⚠️ テストデータの可能性がある注文: ${suspiciousOrders.length}件\n`);
    suspiciousOrders.forEach(order => {
      console.log(`ID: ${order.id}`);
      console.log(`  Patient ID: ${order.patient_id}`);
      console.log(`  氏名: ${order.account_name}`);
      console.log(`  電話: ${order.phone_number}`);
      console.log(`  Email: ${order.email}`);
      console.log(`  作成日: ${order.created_at}`);
      console.log(`  ステータス: ${order.status}`);
      console.log('---');
    });
  }

  // patient_idでグループ化
  const patientGroups = {};
  allOrders.forEach(order => {
    const pid = order.patient_id || 'null';
    if (!patientGroups[pid]) {
      patientGroups[pid] = [];
    }
    patientGroups[pid].push(order);
  });

  console.log(`\n患者数（ユニークpatient_id）: ${Object.keys(patientGroups).length}\n`);

  // 複数注文がある患者をリスト
  const multipleOrders = Object.entries(patientGroups)
    .filter(([_, orders]) => orders.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  if (multipleOrders.length > 0) {
    console.log(`複数注文がある患者: ${multipleOrders.length}人\n`);
    multipleOrders.forEach(([pid, orders]) => {
      console.log(`Patient ID: ${pid} - ${orders.length}件`);
    });
  }

  // 今日の注文
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = allOrders.filter(o =>
    o.submitted_at && o.submitted_at.startsWith(today)
  );
  console.log(`\n今日の注文（submitted_at基準）: ${todayOrders.length}件`);
}

main();
