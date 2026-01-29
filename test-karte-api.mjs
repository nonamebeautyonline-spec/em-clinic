// test-karte-api.mjs
// カルテUIが使うAPIを直接テスト

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

const BASE_URL = envVars.VERCEL_URL || 'http://localhost:3000';

// 明日の日付
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().slice(0, 10);

console.log(`=== カルテAPI テスト（${tomorrowStr}） ===\n`);

// 1. 日付指定なしで全件取得
console.log('[1] 全件取得（日付指定なし）');
try {
  const response = await fetch(`${BASE_URL}/api/intake/list`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (data.ok) {
    console.log(`  ✅ 取得成功: ${data.rows.length}件\n`);
  } else {
    console.log(`  ❌ エラー:`, data.error, '\n');
  }
} catch (e) {
  console.log(`  ❌ エラー:`, e.message, '\n');
}

// 2. 明日の日付で絞り込み
console.log(`[2] 明日の日付で絞り込み（from=${tomorrowStr}&to=${tomorrowStr}）`);
try {
  const response = await fetch(
    `${BASE_URL}/api/intake/list?from=${tomorrowStr}&to=${tomorrowStr}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (data.ok) {
    console.log(`  ✅ 取得成功: ${data.rows.length}件\n`);

    if (data.rows.length > 0) {
      console.log('  --- サンプル（最初の5件） ---');
      data.rows.slice(0, 5).forEach((row, i) => {
        console.log(`  ${i + 1}. PID: ${row.patient_id}, 名前: ${row.patient_name || row.name}, 時間: ${row.reserved_time}, reserveId: ${row.reserve_id}`);
      });
      console.log('');

      // 問題の患者IDがあるか確認
      const targetPatient = data.rows.find(r => r.patient_id === '20260101567');
      if (targetPatient) {
        console.log('  ✅ 問題の患者ID 20260101567 が見つかりました');
        console.log(`     名前: ${targetPatient.patient_name || targetPatient.name}`);
        console.log(`     reserveId: ${targetPatient.reserve_id}`);
        console.log(`     時間: ${targetPatient.reserved_time}`);
      } else {
        console.log('  ❌ 問題の患者ID 20260101567 が見つかりません');
      }
      console.log('');
    }
  } else {
    console.log(`  ❌ エラー:`, data.error, '\n');
  }
} catch (e) {
  console.log(`  ❌ エラー:`, e.message, '\n');
}

console.log('=== テスト完了 ===');
