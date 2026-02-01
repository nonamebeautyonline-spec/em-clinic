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

async function cleanup() {
  console.log('=== bt_NaN レコードをクリーンアップ ===\n');

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', 'bt_NaN');

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  console.log('✅ クリーンアップ完了\n');
}

cleanup().catch(console.error);
