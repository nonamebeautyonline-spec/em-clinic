// add-intake-columns-direct.mjs
// pgライブラリを使ってSupabaseに直接接続してカラム追加

import { readFileSync } from 'fs';
import pg from 'pg';

const envFile = readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;

if (!SUPABASE_URL) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL not found');
  process.exit(1);
}

// URLからproject refを抽出
const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!match) {
  console.log('❌ Invalid SUPABASE_URL format');
  process.exit(1);
}

const projectRef = match[1];

console.log('=== Supabase接続情報が必要です ===\n');
console.log(`Project Ref: ${projectRef}`);
console.log('');
console.log('次の手順でDATABASE_URLを取得してください：');
console.log('1. Supabase Dashboard → Project Settings → Database');
console.log('2. Connection string → URI タブ');
console.log('3. パスワードを入力してコピー');
console.log('4. .env.localに追加：');
console.log('   DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@..."');
console.log('');
console.log('または、ここにペーストしてください（Enter 2回で続行）：');

// 標準入力から読み取り
process.stdin.setEncoding('utf8');

let databaseUrl = '';
let emptyLineCount = 0;

process.stdin.on('data', async (chunk) => {
  if (chunk === '\n') {
    emptyLineCount++;
    if (emptyLineCount >= 2 || databaseUrl.trim()) {
      process.stdin.pause();
      await executeSql(databaseUrl.trim() || envVars.DATABASE_URL);
    }
  } else {
    emptyLineCount = 0;
    databaseUrl += chunk;
  }
});

async function executeSql(dbUrl) {
  if (!dbUrl) {
    console.log('❌ DATABASE_URLが指定されていません');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: dbUrl });

  try {
    console.log('\n接続中...');
    await client.connect();
    console.log('✅ 接続成功\n');

    const sql = `
ALTER TABLE intake
ADD COLUMN IF NOT EXISTS tel TEXT,
ADD COLUMN IF NOT EXISTS verified_phone TEXT;
`;

    console.log('実行中...');
    await client.query(sql);
    console.log('✅ カラム追加完了');

    // 確認
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'intake'
      AND column_name IN ('tel', 'verified_phone');
    `);

    console.log('\n確認:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

  } catch (e) {
    console.log('❌ エラー:', e.message);
  } finally {
    await client.end();
    process.exit(0);
  }
}
