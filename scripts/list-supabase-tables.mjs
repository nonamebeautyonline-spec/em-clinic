#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== Supabase REST API 直接テスト ===\n');

// answerテーブルに直接アクセス
const tables = ['answer', 'answers', 'intake'];

for (const tableName of tables) {
  console.log(`\n--- テーブル: ${tableName} ---`);
  const url = `${supabaseUrl}/rest/v1/${tableName}?limit=1`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    const status = response.status;
    const text = await response.text();

    if (status === 200) {
      const data = JSON.parse(text);
      console.log(`✅ 成功 (${data.length}件)`);
      if (data.length > 0) {
        console.log(`列名: ${Object.keys(data[0]).join(', ')}`);
      }
    } else {
      console.log(`❌ HTTP ${status}`);
    }
  } catch (e) {
    console.log(`❌ エラー: ${e.message}`);
  }
}

// patient_idで検索
console.log(`\n\n--- patient_idで検索テスト ---`);
const testPid = '20260101497';
const searchUrl = `${supabaseUrl}/rest/v1/answer?patient_id=eq.${testPid}&limit=1`;

console.log(`URL: ${searchUrl}`);

try {
  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  const status = response.status;
  const text = await response.text();

  console.log(`Status: ${status}`);
  if (status === 200) {
    const data = JSON.parse(text);
    console.log(`結果: ${JSON.stringify(data, null, 2)}`);
  } else {
    console.log(`エラー: ${text}`);
  }
} catch (e) {
  console.log(`エラー: ${e.message}`);
}
