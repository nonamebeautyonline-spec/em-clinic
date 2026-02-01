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

async function applyStatusColumn() {
  console.log('=== ordersテーブルにstatusカラムを追加 ===\n');

  // PostgreSQL の ALTER TABLE は supabase-js の rpc() で実行
  // または直接 SQL を実行する必要がある

  // Supabase では SQL を直接実行する方法が限られているため、
  // Supabase Dashboard の SQL Editor で実行することを推奨

  console.log('📝 以下のSQLをSupabase Dashboard → SQL Editorで実行してください:\n');
  console.log('---');
  console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT \'confirmed\';');
  console.log('');
  console.log('COMMENT ON COLUMN orders.status IS \'決済確認状態: pending_confirmation=振込確認中, confirmed=確認済み\';');
  console.log('---\n');

  console.log('💡 実行後、以下のコマンドで確認できます:');
  console.log('   node scripts/check-orders-schema.mjs\n');
}

applyStatusColumn().catch(console.error);
