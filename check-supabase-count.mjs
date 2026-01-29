// check-supabase-count.mjs
// Supabaseの実際のデータ件数を確認

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

console.log('=== Supabase データ件数確認 ===\n');

// 明日の予約を確認
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().slice(0, 10);

console.log(`[1] 明日（${tomorrowStr}）の予約件数`);
try {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/intake?reserved_date=eq.${tomorrowStr}`,
    {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
      },
    }
  );

  const data = await response.json();
  const contentRange = response.headers.get('content-range');

  console.log('  取得件数:', data.length);
  console.log('  Content-Range:', contentRange);
  console.log('');

  if (data.length > 0) {
    console.log('  --- サンプル（最初の5件） ---');
    data.slice(0, 5).forEach((row, i) => {
      console.log(`  ${i + 1}. PID: ${row.patient_id}, 名前: ${row.patient_name}, 時間: ${row.reserved_time}`);
    });
    console.log('');
  }
} catch (e) {
  console.log('  ❌ エラー:', e.message);
  console.log('');
}

console.log('=== 完了 ===');
