import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const gasUrl = process.env.GAS_MYPAGE_URL;
const res = await fetch(gasUrl);
const allData = await res.json();

console.log('=== 名前で検索: 高橋優 ===\n');

// 完全一致
const exact = allData.filter(row => {
  const name = row.name || row['氏名'] || '';
  return name === '高橋優' || name === '高橋　優';
});

console.log(`完全一致: ${exact.length}件\n`);

if (exact.length > 0) {
  exact.forEach((row, i) => {
    console.log(`[${i+1}]`);
    console.log(`  Patient_ID: ${row.Patient_ID}`);
    console.log(`  patient_id: ${row.patient_id}`);
    console.log(`  氏名: ${row.name || row['氏名']}`);
    console.log(`  timestamp: ${row.timestamp}`);
    console.log(`  reserve_id: ${row.reserveId || row.reserved}`);
    console.log('');
  });
}

// 部分一致
const partial = allData.filter(row => {
  const name = row.name || row['氏名'] || '';
  return (name.includes('高橋') || name.includes('たかはし')) && (name.includes('優') || name.includes('ゆう'));
});

console.log(`\n部分一致: ${partial.length}件\n`);

if (partial.length > 0 && partial.length > exact.length) {
  partial.forEach((row, i) => {
    console.log(`[${i+1}]`);
    console.log(`  Patient_ID: ${row.Patient_ID}`);
    console.log(`  氏名: ${row.name || row['氏名']}`);
    console.log('');
  });
}

console.log(`\nGAS総データ件数: ${allData.length}件`);
