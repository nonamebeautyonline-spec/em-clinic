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

console.log('=== intake テーブルのスキーマ確認 ===\n');

const { data, error } = await supabase
  .from('intake')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

if (data && data.length > 0) {
  const columns = Object.keys(data[0]);
  console.log('カラム数:', columns.length);
  console.log('\nカラム一覧:');
  columns.forEach((col, i) => {
    console.log(`  ${i + 1}. ${col}`);
  });

  // Lstep関連のカラムを探す
  const lstepCols = columns.filter(col =>
    col.toLowerCase().includes('lstep') ||
    col.toLowerCase().includes('line') ||
    col.toLowerCase().includes('user_id')
  );

  if (lstepCols.length > 0) {
    console.log('\n🎯 Lstep/LINE/user_id関連のカラム:');
    lstepCols.forEach(col => {
      console.log(`  - ${col}: ${data[0][col]}`);
    });
  }
}
