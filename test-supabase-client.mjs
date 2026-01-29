// test-supabase-client.mjs
// Supabase JSクライアントを使って直接テスト（カルテAPIと同じクエリ）

import { createClient } from '@supabase/supabase-js';
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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// 明日の日付
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().slice(0, 10);

console.log(`=== Supabase JSクライアント テスト（${tomorrowStr}） ===\n`);

// 1. 日付指定なしで全件取得（カルテAPIのデフォルト動作）
console.log('[1] 全件取得（日付指定なし）');
try {
  let query = supabase
    .from('intake')
    .select('*')
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.log(`  ❌ エラー:`, error.message, '\n');
  } else {
    console.log(`  ✅ 取得成功: ${data.length}件\n`);
  }
} catch (e) {
  console.log(`  ❌ エラー:`, e.message, '\n');
}

// 2. 明日の日付で絞り込み（カルテUIで日付指定した場合）
console.log(`[2] 明日の日付で絞り込み（${tomorrowStr}）`);
try {
  let query = supabase
    .from('intake')
    .select('*')
    .order('created_at', { ascending: false })
    .gte('reserved_date', tomorrowStr)
    .lte('reserved_date', tomorrowStr)
    .not('reserved_date', 'is', null);

  const { data, error } = await query;

  if (error) {
    console.log(`  ❌ エラー:`, error.message, '\n');
  } else {
    console.log(`  ✅ 取得成功: ${data.length}件\n`);

    if (data.length > 0) {
      console.log('  --- サンプル（最初の5件） ---');
      data.slice(0, 5).forEach((row, i) => {
        console.log(`  ${i + 1}. PID: ${row.patient_id}, 名前: ${row.patient_name}, 時間: ${row.reserved_time}, reserveId: ${row.reserve_id}`);
      });
      console.log('');

      // 問題の患者IDがあるか確認
      const targetPatient = data.find(r => r.patient_id === '20260101567');
      if (targetPatient) {
        console.log('  ✅ 問題の患者ID 20260101567 が見つかりました');
        console.log(`     名前: ${targetPatient.patient_name}`);
        console.log(`     reserveId: ${targetPatient.reserve_id}`);
        console.log(`     時間: ${targetPatient.reserved_time}`);
      } else {
        console.log('  ❌ 問題の患者ID 20260101567 が見つかりません');
      }
      console.log('');
    }
  }
} catch (e) {
  console.log(`  ❌ エラー:`, e.message, '\n');
}

console.log('=== テスト完了 ===');
