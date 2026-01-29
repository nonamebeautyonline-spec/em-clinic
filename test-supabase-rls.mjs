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

console.log('=== Supabase RLS & 書き込みテスト ===\n');

// 1. 現在の接続情報
console.log('1. 接続情報');
console.log('  URL:', envVars.NEXT_PUBLIC_SUPABASE_URL);
console.log('  Using anon key\n');

// 2. テスト書き込み（実際の問診送信と同じデータ構造）
const testPatientId = 'test-' + Date.now();
console.log('2. テスト書き込み');
console.log('  patient_id:', testPatientId);

const testData = {
  patient_id: testPatientId,
  patient_name: 'テスト患者',
  answerer_id: '123456',
  line_id: 'U1234567890abcdef1234567890abcdef',
  reserve_id: null,
  reserved_date: null,
  reserved_time: null,
  status: null,
  note: null,
  prescription_menu: null,
  answers: {
    氏名: 'テスト患者',
    name: 'テスト患者',
    性別: '女',
    sex: '女'
  }
};

const startTime = Date.now();
const { data, error } = await supabase
  .from('intake')
  .upsert(testData, { onConflict: 'patient_id' });
const duration = Date.now() - startTime;

if (error) {
  console.log('  ❌ 書き込み失敗');
  console.log('  エラーコード:', error.code);
  console.log('  エラーメッセージ:', error.message);
  console.log('  詳細:', error.details);
  console.log('  ヒント:', error.hint);
  console.log('\n  原因分析:');
  
  if (error.code === '42501' || error.message.includes('permission')) {
    console.log('  → RLS（Row Level Security）ポリシーで拒否されています');
    console.log('  → anon roleに書き込み権限がありません');
  } else if (error.code === '23505') {
    console.log('  → UNIQUE制約違反（既に存在するpatient_id）');
  } else if (error.code === '23503') {
    console.log('  → FOREIGN KEY制約違反（存在しない外部キー参照）');
  } else if (error.message.includes('timeout')) {
    console.log('  → タイムアウトエラー');
  } else {
    console.log('  → 不明なエラー。Supabase Dashboardで確認してください');
  }
} else {
  console.log('  ✅ 書き込み成功');
  console.log('  所要時間:', duration + 'ms');
  
  // 書き込んだデータを確認
  const { data: readData, error: readError } = await supabase
    .from('intake')
    .select('patient_id, patient_name, answerer_id, line_id')
    .eq('patient_id', testPatientId)
    .single();
  
  if (!readError) {
    console.log('  確認:');
    console.log('    patient_name:', readData.patient_name);
    console.log('    answerer_id:', readData.answerer_id);
    console.log('    line_id:', readData.line_id);
  }
  
  // テストデータを削除
  await supabase.from('intake').delete().eq('patient_id', testPatientId);
  console.log('  テストデータを削除しました');
}

console.log('\n3. 結論');
if (error) {
  console.log('  ❌ anon keyでの書き込みに問題があります');
  console.log('  ⚠️ 本番環境で同じエラーが発生している可能性が高い');
} else {
  console.log('  ✅ anon keyでの書き込みは正常に動作しています');
  console.log('  → 3人の失敗は一時的なネットワークエラーの可能性が高い');
}
