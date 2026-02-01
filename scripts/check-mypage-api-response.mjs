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

const patientId = process.argv[2] || '20251200404';

console.log(`=== マイページAPI レスポンス確認（患者ID: ${patientId}）===\n`);

// マイページAPIを呼び出し（POSTメソッド）
const apiUrl = `http://localhost:3000/api/mypage`;

try {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `patient_id=${patientId}`
    }
  });
  const data = await response.json();

  console.log('ステータス:', response.status);
  console.log();

  if (data.orders) {
    console.log(`注文件数: ${data.orders.length}件\n`);

    data.orders.forEach((order, idx) => {
      console.log(`${idx + 1}. ${order.id}`);
      console.log(`   決済日時: ${order.paidAt}`);
      console.log(`   決済方法: ${order.paymentMethod}`);
      console.log(`   商品: ${order.productName}`);
      console.log(`   金額: ${order.amount}円`);
      console.log(`   配送: ${order.shippingStatus}`);
      console.log(`   追跡番号: ${order.trackingNumber || '(なし)'}`);
      console.log(`   決済ステータス: ${order.paymentStatus}`);
      console.log();
    });

    // 重複チェック
    const orderIds = data.orders.map(o => o.id);
    const uniqueIds = new Set(orderIds);

    if (orderIds.length !== uniqueIds.size) {
      console.log('⚠️ 注文IDに重複があります！');
      const duplicates = orderIds.filter((id, idx) => orderIds.indexOf(id) !== idx);
      console.log('重複ID:', duplicates);
    }

    // 銀行振込の件数
    const bankTransferOrders = data.orders.filter(o => o.paymentMethod === 'bank_transfer');
    console.log(`銀行振込注文: ${bankTransferOrders.length}件`);

    // 1/30の注文をフィルタ
    const jan30Orders = data.orders.filter(o => {
      const date = new Date(o.paidAt);
      return date.getMonth() === 0 && date.getDate() === 30;
    });
    console.log(`1/30の注文: ${jan30Orders.length}件`);

    if (jan30Orders.length > 1) {
      console.log('\n⚠️ 1/30の注文が複数あります:');
      jan30Orders.forEach(o => {
        console.log(`  - ${o.id} (${o.paymentMethod})`);
      });
    }
  }

} catch (e) {
  console.error('❌ エラー:', e.message);
  console.error('\n開発サーバーが起動していることを確認してください（npm run dev）');
}
