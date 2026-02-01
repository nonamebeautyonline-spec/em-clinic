import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function checkGASStructure() {
  console.log('=== GAS問診シートのデータ構造を確認 ===\n');

  const gasUrl = process.env.GAS_MYPAGE_URL;
  if (!gasUrl) {
    console.error('❌ GAS_MYPAGE_URL が設定されていません');
    return;
  }

  try {
    const res = await fetch(`${gasUrl}`, {
      method: 'GET',
    });

    if (!res.ok) {
      console.error(`❌ GAS API呼び出し失敗: ${res.status}`);
      return;
    }

    const allData = await res.json();
    console.log(`✅ GASから${allData.length}件取得\n`);

    if (allData.length > 0) {
      console.log('【最初の1件のデータ構造】');
      console.log(JSON.stringify(allData[0], null, 2));
      console.log('\n【フィールド一覧】');
      const fields = Object.keys(allData[0]);
      fields.forEach((field, i) => {
        const value = allData[0][field];
        const type = typeof value;
        const preview = type === 'string' ? `"${value.slice(0, 50)}"` : value;
        console.log(`${i + 1}. ${field} (${type}): ${preview}`);
      });
    }

  } catch (e) {
    console.error('❌ エラー:', e.message);
  }
}

checkGASStructure().catch(console.error);
