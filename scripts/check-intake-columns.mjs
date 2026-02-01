import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  // 1件だけ取得してカラム構造を確認
  const { data, error } = await supabase
    .from('intake')
    .select('*')
    .limit(1);

  if (error) {
    console.error('エラー:', error.message);
  } else if (data && data.length > 0) {
    console.log('intakeテーブルのカラム一覧:');
    console.log('');
    const columns = Object.keys(data[0]);
    for (let i = 0; i < columns.length; i++) {
      console.log(`  ${i + 1}. ${columns[i]}`);
    }
  } else {
    console.log('データなし');
  }
}

checkColumns().catch(console.error);
