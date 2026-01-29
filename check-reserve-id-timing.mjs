// check-reserve-id-timing.mjs
// reserveIdのタイムスタンプから作成時刻を確認

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

const GAS_INTAKE_URL = envVars.GAS_INTAKE_URL || envVars.GAS_INTAKE_LIST_URL;

console.log('=== reserveIdから作成時刻を逆算 ===\n');

// GASから全データ取得
let gasRows = [];

try {
  const response = await fetch(GAS_INTAKE_URL, {
    method: 'GET',
  });

  const data = await response.json();

  if (data.ok && Array.isArray(data.rows)) {
    gasRows = data.rows;
  } else if (Array.isArray(data)) {
    gasRows = data;
  }

  console.log(`GASから取得: ${gasRows.length}件\n`);
} catch (e) {
  console.log(`❌ エラー: ${e.message}\n`);
  process.exit(1);
}

// 予約があるレコードのみフィルタ
const withReservations = gasRows.filter(r => {
  const date = String(r.reserved_date || r['予約日'] || '').trim();
  const time = String(r.reserved_time || r['予約時間'] || '').trim();
  const reserveId = String(r.reserveId || r.reserve_id || '').trim();
  return date && time && reserveId && reserveId.startsWith('resv-');
});

// reserveIdから作成時刻を抽出（resv-1769644367547 → 1769644367547 → Date）
const withTimestamps = withReservations.map(r => {
  const reserveId = String(r.reserveId || r.reserve_id || '').trim();
  const timestamp = parseInt(reserveId.replace('resv-', ''));
  const createdAt = new Date(timestamp);

  return {
    patient_id: r.patient_id,
    patient_name: r.patient_name || r.name || r['氏名'],
    reserveId: reserveId,
    reserved_date: r.reserved_date || r['予約日'],
    reserved_time: r.reserved_time || r['予約時間'],
    createdAt: createdAt,
    createdAtJST: createdAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    tel: r.tel || '',
    verified_phone: r.verified_phone || ''
  };
});

// 作成時刻でソート（新しい順）
withTimestamps.sort((a, b) => b.createdAt - a.createdAt);

console.log('=== 最新20件の予約作成時刻 ===\n');

withTimestamps.slice(0, 20).forEach((r, i) => {
  console.log(`${i + 1}. PID: ${r.patient_id}`);
  console.log(`   名前: ${r.patient_name}`);
  console.log(`   reserveId: ${r.reserveId}`);
  console.log(`   作成日時: ${r.createdAtJST}`);
  console.log(`   予約日時: ${r.reserved_date} ${r.reserved_time}`);
  console.log(`   tel (X列): ${r.tel || '(空)'}`);
  console.log(`   verified_phone (AG列): ${r.verified_phone || '(空)'}`);
  console.log('');
});

// 昨日23時〜今朝0時の間に作成された予約を抽出
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(23, 0, 0, 0);

const today = new Date();
today.setHours(0, 0, 0, 0);

const duringLimit = withTimestamps.filter(r => {
  return r.createdAt >= yesterday && r.createdAt < today;
});

console.log(`\n=== 昨日23時〜今朝0時の間に作成された予約（制限中）: ${duringLimit.length}件 ===\n`);

duringLimit.forEach((r, i) => {
  console.log(`${i + 1}. PID: ${r.patient_id}, 作成: ${r.createdAtJST}, 予約: ${r.reserved_date} ${r.reserved_time}`);
});

console.log('\n=== 完了 ===');
