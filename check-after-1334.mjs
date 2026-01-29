// check-after-1334.mjs
// 2026/01/29 13:34以降の問診データをチェック

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

console.log('=== 2026/01/29 13:34以降の問診データをチェック ===\n');

// 2026/01/29 13:34 JST = 2026/01/29 04:34 UTC
const cutoffDate = new Date('2026-01-29T04:34:00Z');

const { data: intakes, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, answerer_id, line_id, created_at')
  .gte('created_at', cutoffDate.toISOString())
  .order('created_at', { ascending: true });

if (error) {
  console.error('エラー:', error.message);
  process.exit(1);
}

console.log(`該当件数: ${intakes.length}件\n`);

if (intakes.length === 0) {
  console.log('該当する問診データがありません。');
  process.exit(0);
}

console.log('--- 13:34以降の全問診 ---');
const missing = [];
const ok = [];

for (const intake of intakes) {
  const created = new Date(intake.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const hasMissingData = !intake.patient_name || !intake.answerer_id || !intake.line_id;

  console.log(`\n${intake.patient_id} (${created})`);
  console.log(`  patient_name: ${intake.patient_name || '(なし)'}`);
  console.log(`  answerer_id: ${intake.answerer_id || '(なし)'}`);
  console.log(`  line_id: ${intake.line_id ? 'あり' : '(なし)'}`);

  if (hasMissingData) {
    missing.push(intake);
    console.log('  ❌ 個人情報欠損');
  } else {
    ok.push(intake);
    console.log('  ✅ OK');
  }
}

console.log('\n=== 結果サマリー ===');
console.log(`総件数: ${intakes.length}件`);
console.log(`OK: ${ok.length}件`);
console.log(`個人情報欠損: ${missing.length}件`);

if (missing.length > 0) {
  console.log('\n❌ masterInfo修正が正しく動作していません。');
  console.log(`   ${missing.length}件の問診で個人情報が欠損しています。`);
  console.log('\n調査が必要な項目:');
  console.log('  1. Vercelログで[Intake] masterInfo処理のログを確認');
  console.log('  2. GASログでmasterInfo返却のログを確認');
  console.log('  3. テスト問診を送信して動作を確認');
} else {
  console.log('\n✅ 全ての問診で個人情報が正しく保存されています。');
  console.log('   masterInfo修正は正常に動作しています。');
  console.log('   20260101588は例外的なケースの可能性があります。');
}
