// bulk-fix-missing-info.mjs
// Supabaseで個人情報が欠損している最新予約を全員修正

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

const GAS_INTAKE_URL = envVars.GAS_INTAKE_LIST_URL;

console.log('=== 個人情報欠損レコードの一括修正 ===\n');

// 1. Supabaseから最新50件で個人情報が欠損しているレコードを取得
console.log('1. Supabaseから個人情報欠損レコードを取得中...');
const { data: intakes, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, answerer_id, line_id, created_at')
  .order('created_at', { ascending: false })
  .limit(100);

if (error) {
  console.error('❌ Supabase取得エラー:', error.message);
  process.exit(1);
}

const missing = intakes.filter(i => !i.patient_name || !i.answerer_id || !i.line_id);

console.log(`  取得: ${intakes.length}件`);
console.log(`  欠損: ${missing.length}件\n`);

if (missing.length === 0) {
  console.log('✅ 個人情報が欠損しているレコードはありません');
  process.exit(0);
}

// 2. GASシートから全データ取得
console.log('2. GASシートから全データ取得中...');
const gasRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

console.log(`  取得: ${gasRows.length}件\n`);

// GASデータをpatient_idでマップ化
const gasMap = new Map();
for (const row of gasRows) {
  const pid = String(row.patient_id || '').trim();
  if (pid) {
    gasMap.set(pid, row);
  }
}

// 3. 各欠損レコードを修正
console.log('3. 修正処理開始...\n');

let fixed = 0;
let notFound = 0;
let failed = 0;

for (const record of missing) {
  const pid = record.patient_id;
  const gasMatch = gasMap.get(pid);

  if (!gasMatch) {
    console.log(`❌ ${pid}: GASシートに見つかりません`);
    notFound++;
    continue;
  }

  // GASデータが欠損している場合もスキップ
  if (!gasMatch.patient_name && !gasMatch.name) {
    console.log(`⚠️  ${pid}: GASシートにも氏名がありません`);
    notFound++;
    continue;
  }

  const masterInfo = {
    name: gasMatch.patient_name || gasMatch.name || '',
    sex: gasMatch.sex || '',
    birth: gasMatch.birth || '',
    nameKana: gasMatch.name_kana || '',
    tel: gasMatch.tel || '',
    answererId: gasMatch.answerer_id || '',
    lineUserId: gasMatch.line_id || ''
  };

  // answersを取得
  const { data: current } = await supabase
    .from('intake')
    .select('answers')
    .eq('patient_id', pid)
    .single();

  const updatedAnswers = {
    ...current?.answers,
    氏名: masterInfo.name,
    name: masterInfo.name,
    性別: masterInfo.sex || current?.answers?.性別 || '',
    sex: masterInfo.sex || current?.answers?.sex || '',
    生年月日: masterInfo.birth || current?.answers?.生年月日 || '',
    birth: masterInfo.birth || current?.answers?.birth || '',
    カナ: masterInfo.nameKana || current?.answers?.カナ || '',
    name_kana: masterInfo.nameKana || current?.answers?.name_kana || '',
    電話番号: masterInfo.tel || current?.answers?.電話番号 || '',
    tel: masterInfo.tel || current?.answers?.tel || '',
    answerer_id: masterInfo.answererId || current?.answers?.answerer_id || '',
    line_id: masterInfo.lineUserId || current?.answers?.line_id || ''
  };

  // Supabaseを更新
  const { error: updateError } = await supabase
    .from('intake')
    .update({
      patient_name: masterInfo.name || null,
      answerer_id: masterInfo.answererId || null,
      line_id: masterInfo.lineUserId || null,
      answers: updatedAnswers
    })
    .eq('patient_id', pid);

  if (updateError) {
    console.log(`❌ ${pid}: 更新失敗 - ${updateError.message}`);
    failed++;
  } else {
    console.log(`✅ ${pid}: ${masterInfo.name}`);
    fixed++;
  }

  // Rate limit対策
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log('\n=== 結果 ===');
console.log(`修正成功: ${fixed}件`);
console.log(`GASに見つからない: ${notFound}件`);
console.log(`更新失敗: ${failed}件`);

// 4. キャッシュ一括無効化
if (fixed > 0) {
  console.log('\n4. キャッシュ一括無効化中...');
  const ADMIN_TOKEN = envVars.ADMIN_TOKEN;
  const APP_BASE_URL = envVars.APP_BASE_URL || envVars.NEXT_PUBLIC_APP_URL;

  if (ADMIN_TOKEN && APP_BASE_URL) {
    for (const record of missing.slice(0, fixed)) {
      try {
        await fetch(`${APP_BASE_URL}/api/admin/invalidate-cache`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ patient_id: record.patient_id })
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        // エラーは無視
      }
    }
    console.log('✅ キャッシュ無効化完了');
  }
}

console.log('\n完了しました。');
