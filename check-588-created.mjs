// check-588-created.mjs
// patient_id: 20260101588の作成日時を確認

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

const patientId = "20260101588";

const { data, error } = await supabase
  .from('intake')
  .select('patient_id, created_at, updated_at')
  .eq('patient_id', patientId)
  .single();

if (error) {
  console.error('エラー:', error.message);
  process.exit(1);
}

const created = new Date(data.created_at);
const updated = new Date(data.updated_at);
const now = new Date();

console.log('=== patient_id:', patientId, '===\n');
console.log('作成日時:', created.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
console.log('更新日時:', updated.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
console.log('');

// masterInfo修正のデプロイ日時（2026/01/29 13:00頃と仮定）
const deployDate = new Date('2026-01-29T04:00:00Z'); // UTC 04:00 = JST 13:00

console.log('masterInfo修正デプロイ日時:', deployDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
console.log('');

if (created < deployDate) {
  console.log('✅ この問診はmasterInfo修正のデプロイ前に作成されました。');
  console.log('   個人情報欠損は、デプロイ前の既知の問題です。');
  console.log('   fix-588.mjsで修正済みです。');
} else {
  console.log('❌ この問診はmasterInfo修正のデプロイ後に作成されました。');
  console.log('   masterInfo修正が正しく動作していない可能性があります。');
  console.log('   Next.jsのログを確認してください。');
}
