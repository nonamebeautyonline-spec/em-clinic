// check-recent-missing-data.mjs
// 最近の問診（2026/01/29以降）で個人情報が抜けているデータを確認

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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('=== 最近の問診データの整合性チェック ===\n');

// 1. Supabaseから最新の問診データを取得
console.log('1. Supabase最新データ取得中...');
const { data: intakes, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, answerer_id, line_id, created_at')
  .order('created_at', { ascending: false })
  .limit(50);

if (error) {
  console.error('エラー:', error.message);
  process.exit(1);
}

console.log(`取得件数: ${intakes.length}件\n`);

// 2. 個人情報が抜けているデータを抽出
const missing = intakes.filter(i => {
  return !i.patient_name || !i.answerer_id || !i.line_id;
});

console.log(`個人情報欠損: ${missing.length}件\n`);

if (missing.length === 0) {
  console.log('✅ 最新50件の問診データに欠損はありません。');
  console.log('   masterInfo修正が正しく動作しています。');
  process.exit(0);
}

// 3. 欠損データの詳細
console.log('--- 個人情報が欠損している問診 ---');
for (const m of missing) {
  const pid = m.patient_id;
  const created = new Date(m.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

  console.log(`\npatient_id: ${pid}`);
  console.log(`  作成日時: ${created}`);
  console.log(`  patient_name: ${m.patient_name || '(なし)'}`);
  console.log(`  answerer_id: ${m.answerer_id || '(なし)'}`);
  console.log(`  line_id: ${m.line_id || '(なし)'}`);
}

// 4. GASシートと照合
console.log('\n4. GASシートと照合中...');
const GAS_INTAKE_URL = envVars.GAS_INTAKE_LIST_URL;
const gasRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

console.log('\n--- GASシートとの比較 ---');
for (const m of missing) {
  const pid = m.patient_id;
  const gasMatch = gasRows.find(r => String(r.patient_id).trim() === pid);

  if (gasMatch && gasMatch.patient_name) {
    console.log(`\n${pid}:`);
    console.log(`  GASには存在: ${gasMatch.patient_name}`);
    console.log(`  ❌ Supabaseに反映されていません`);
  }
}

console.log('\n=== 結果 ===');
console.log(`❌ ${missing.length}件の問診で個人情報が欠損しています。`);
console.log('\n原因候補:');
console.log('  1. masterInfo修正がまだデプロイされていない問診（デプロイ前の問診）');
console.log('  2. masterInfo返却が正しく動作していない');
console.log('  3. Next.js側のmasterInfo処理が正しく動作していない');
console.log('\n推奨対応:');
console.log(`  1. ${missing.length}件のデータを一括修正スクリプトで修正`);
console.log('  2. Next.jsのログでmasterInfo処理を確認');
console.log('  3. 新規問診でmasterInfoが正しく返されているか確認');
