// bulk-fix-missing-tel.mjs
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

console.log('=== 電話番号が抜けている患者を修正 ===\n');

const patients = [
  { pid: '20260101600', name: '坪倉　奈都美', tel: '09097316110' },
  { pid: '20260101598', name: '戸矢　知子', tel: '07026457039' },
  { pid: '20260101589', name: '星愛美', tel: '09013743329' },
  { pid: '20260101597', name: '岩波　ひまり', tel: '08094027578' },
  { pid: '20260101596', name: '大木 麻美', tel: '09079045577' }
];

let success = 0;
let failed = 0;

for (const p of patients) {
  console.log(`処理中: ${p.pid} (${p.name})`);

  // 現在のanswersを取得
  const { data: current, error: fetchError } = await supabase
    .from('intake')
    .select('answers')
    .eq('patient_id', p.pid)
    .single();

  if (fetchError) {
    console.log(`  ❌ 取得失敗: ${fetchError.message}`);
    failed++;
    continue;
  }

  const existingAnswers = current?.answers || {};
  const mergedAnswers = {
    ...existingAnswers,
    電話番号: p.tel,
    tel: p.tel
  };

  // 更新
  const { error: updateError } = await supabase
    .from('intake')
    .update({ answers: mergedAnswers })
    .eq('patient_id', p.pid);

  if (updateError) {
    console.log(`  ❌ 更新失敗: ${updateError.message}`);
    failed++;
  } else {
    console.log(`  ✅ 更新成功: tel=${p.tel}`);
    success++;
  }
}

console.log(`\n=== 結果 ===`);
console.log(`成功: ${success}件`);
console.log(`失敗: ${failed}件`);

// キャッシュ無効化
console.log(`\nキャッシュを無効化中...`);
const ADMIN_TOKEN = envVars.ADMIN_TOKEN;
const APP_BASE_URL = envVars.APP_BASE_URL;

for (const p of patients) {
  try {
    const res = await fetch(`${APP_BASE_URL}/api/admin/invalidate-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ patient_id: p.pid })
    });

    if (res.ok) {
      console.log(`✅ キャッシュ削除: ${p.pid}`);
    } else {
      console.log(`⚠️  キャッシュ削除失敗: ${p.pid} (${res.status})`);
    }
  } catch (e) {
    console.log(`⚠️  キャッシュ削除エラー: ${p.pid}`);
  }
}

console.log('\n完了しました。');
