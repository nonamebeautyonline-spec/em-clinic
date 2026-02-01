import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function checkGAS() {
  const gasUrl = process.env.GAS_SQUARE_WEBHOOK_URL;
  const patientId = '20260100043';

  console.log(`=== GAS Square Webhookシートで${patientId}を確認 ===\n`);

  const res = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'list_all' }),
  });

  const data = await res.json();
  const rows = data.rows || [];

  console.log(`全${rows.length}件中、patient_id=${patientId}を検索...\n`);

  const matches = rows.filter(row => row[11] === patientId); // patient_id は11列目

  if (matches.length === 0) {
    console.log('該当データなし');
    return;
  }

  console.log(`${matches.length}件見つかりました:\n`);

  matches.forEach((row, i) => {
    const order_datetime = row[0];
    const shipping_name = row[1]; // B列
    const postal = row[2];
    const address = row[3];
    const email = row[4];
    const phone = row[5];
    const items = row[6];
    const amount = row[7];
    const billing_name = row[8];
    const payment_id = row[9];
    const product_code = row[10];

    console.log(`${i + 1}.`);
    console.log(`   決済日時: ${order_datetime}`);
    console.log(`   Payment ID: ${payment_id}`);
    console.log(`   配送先氏名 (B列): "${shipping_name}"`);
    console.log(`   郵便番号: ${postal}`);
    console.log(`   住所: ${address}`);
    console.log(`   Email: ${email}`);
    console.log(`   Phone: ${phone}`);
    console.log(`   商品: ${items}`);
    console.log(`   金額: ${amount}`);
    console.log(`   請求先氏名: ${billing_name}`);
    console.log('');
  });
}

checkGAS().catch(console.error);
