// check-supabase-total-count.mjs
// Supabaseの総レコード数を確認

import { readFileSync } from 'fs';

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
const SUPABASE_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== Supabase 総レコード数確認 ===\n');

// reserved_dateがnullでないレコードの総数
try {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/intake?reserved_date=not.is.null&select=patient_id`,
    {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
      },
    }
  );

  const contentRange = response.headers.get('content-range');
  console.log('reserved_date が存在するレコード:');
  console.log(`  Content-Range: ${contentRange}\n`);

  if (contentRange) {
    const match = contentRange.match(/\/(\d+)$/);
    if (match) {
      const total = parseInt(match[1]);
      console.log(`  総数: ${total}件\n`);
    }
  }
} catch (e) {
  console.log('❌ エラー:', e.message);
}

// 全レコードの総数（reserved_date=nullも含む）
try {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/intake?select=patient_id`,
    {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
      },
    }
  );

  const contentRange = response.headers.get('content-range');
  console.log('全レコード（reserved_date=null含む）:');
  console.log(`  Content-Range: ${contentRange}\n`);

  if (contentRange) {
    const match = contentRange.match(/\/(\d+)$/);
    if (match) {
      const total = parseInt(match[1]);
      console.log(`  総数: ${total}件\n`);
    }
  }
} catch (e) {
  console.log('❌ エラー:', e.message);
}
