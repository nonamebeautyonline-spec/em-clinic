import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function checkGASData() {
  console.log('=== GAS Square Webhookシートからデータ確認 ===\n');

  const gasUrl = process.env.GAS_SQUARE_WEBHOOK_URL;
  if (!gasUrl) {
    console.error('❌ GAS_SQUARE_WEBHOOK_URL が設定されていません');
    return;
  }

  console.log('GASからlist_allで全データ取得中...\n');

  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'list_all' }),
    });

    if (!res.ok) {
      console.error(`❌ GAS API呼び出し失敗: ${res.status}`);
      const text = await res.text();
      console.error('   Response:', text);
      return;
    }

    const data = await res.json();
    const rows = data.rows || [];

    console.log(`✅ ${rows.length}件のデータを取得しました\n`);

    // 最新5件のshipping_name（B列、インデックス1）を確認
    console.log('最新5件のshipping_name確認:');
    console.log('ヘッダー想定: [order_datetime, name（配送先）, postal, address, ...]');
    console.log('');

    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      const shipping_name = row[1]; // B列（インデックス1）
      const payment_id = row[9]; // payment_id（インデックス9）
      const patient_id = row[11]; // patient_id（インデックス11）

      console.log(`${i + 1}. Payment ID: ${payment_id}`);
      console.log(`   Patient ID: ${patient_id}`);
      console.log(`   Shipping Name (B列): "${shipping_name}"`);
      console.log(`   型: ${typeof shipping_name}`);
      console.log('');
    }

    // 全体の統計
    let withName = 0;
    let withoutName = 0;

    for (const row of rows) {
      const shipping_name = row[1];
      if (shipping_name && shipping_name !== '') {
        withName++;
      } else {
        withoutName++;
      }
    }

    console.log('=== 統計 ===');
    console.log(`shipping_nameあり: ${withName}件`);
    console.log(`shipping_nameなし: ${withoutName}件`);
    console.log(`割合: ${((withName / rows.length) * 100).toFixed(1)}%`);
  } catch (e) {
    console.error('❌ エラー:', e.message);
  }
}

checkGASData().catch(console.error);
