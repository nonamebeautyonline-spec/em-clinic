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

console.log('=== orders テーブルのスキーマ確認 ===\n');

const { data, error } = await supabase
  .from('orders')
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
    const value = data[0][col];
    const type = typeof value;
    console.log(`  ${i + 1}. ${col}: ${type} = ${JSON.stringify(value)}`);
  });

  // statusカラムがあるか確認
  if (columns.includes('status')) {
    console.log('\n✅ statusカラムが存在します');
  } else {
    console.log('\n⚠️  statusカラムが存在しません → 追加が必要');
    console.log('\nSQL:');
    console.log('  ALTER TABLE orders ADD COLUMN status TEXT DEFAULT \'confirmed\';');
  }
}
