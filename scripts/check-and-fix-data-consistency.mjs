// check-and-fix-data-consistency.mjs
// GASとSupabaseのデータ整合性をチェックして自動補完

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

console.log('=== データ整合性チェック ===');
console.log(`開始時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n`);

// 1. GASシートから全データ取得
console.log('1. GASシートから全データ取得中...');
const gasRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;
console.log(`  取得: ${gasRows.length}件`);

// 2. Supabaseから全patient_idを取得
console.log('2. Supabaseから全patient_idを取得中...');
const allSupabaseIds = new Set();
let offset = 0;
const batchSize = 1000;

while (true) {
  const { data: batch, error } = await supabase
    .from('intake')
    .select('patient_id')
    .range(offset, offset + batchSize - 1);

  if (error) {
    console.error('❌ Supabase取得エラー:', error.message);
    process.exit(1);
  }

  if (batch.length === 0) break;

  for (const record of batch) {
    allSupabaseIds.add(record.patient_id);
  }

  offset += batchSize;
  if (batch.length < batchSize) break;
}

console.log(`  取得: ${allSupabaseIds.size}件`);

// 3. 差分を検出
console.log('3. 差分を検出中...');

const missingInSupabase = [];
for (const row of gasRows) {
  const pid = String(row.patient_id || '').trim();
  if (!pid) continue;

  if (!allSupabaseIds.has(pid)) {
    missingInSupabase.push({
      patient_id: pid,
      patient_name: row.patient_name || row.name || '(なし)',
      answerer_id: row.answerer_id || '(なし)',
      line_id: row.line_id || '(なし)',
      reserved_date: row.reserved_date || '(なし)',
      fullData: row
    });
  }
}

console.log(`  欠損: ${missingInSupabase.length}件\n`);

if (missingInSupabase.length === 0) {
  console.log('✅ データ整合性OK：全てのGASレコードがSupabaseに存在します');
  process.exit(0);
}

// 4. 自動補完
console.log('❌ データ不整合を検出しました');
console.log(`\n欠損レコード (${missingInSupabase.length}件):`);
for (const record of missingInSupabase) {
  console.log(`  - ${record.patient_id}: ${record.patient_name} (${record.reserved_date})`);
}

console.log('\n4. 自動補完を開始...');

let fixed = 0;
let failed = 0;

for (const record of missingInSupabase) {
  const row = record.fullData;
  const pid = record.patient_id;

  // birth をフォーマット
  let birthStr = "";
  if (row.birth) {
    const birthDate = new Date(row.birth);
    birthStr = birthDate.toISOString().split('T')[0];
  }

  const answers = {
    氏名: row.name || "",
    name: row.name || "",
    性別: row.sex || "",
    sex: row.sex || "",
    生年月日: birthStr,
    birth: birthStr,
    カナ: row.name_kana || "",
    name_kana: row.name_kana || "",
    電話番号: String(row.tel || ""),
    tel: String(row.tel || ""),
    answerer_id: String(row.answerer_id || ""),
    line_id: row.line_id || "",
    ng_check: row.ng_check || "",
    current_disease_yesno: row.current_disease_yesno || "",
    current_disease_detail: row.current_disease_detail || "",
    glp_history: row.glp_history || "",
    med_yesno: row.med_yesno || "",
    med_detail: row.med_detail || "",
    allergy_yesno: row.allergy_yesno || "",
    allergy_detail: row.allergy_detail || "",
    entry_route: row.entry_route || "",
    entry_other: row.entry_other || ""
  };

  console.log(`  補完中: ${pid} - ${row.name}`);

  const { error: insertError } = await supabase
    .from('intake')
    .insert({
      patient_id: pid,
      patient_name: row.name || null,
      answerer_id: String(row.answerer_id) || null,
      line_id: row.line_id || null,
      reserve_id: row.reserveId || null,
      reserved_date: row.reserved_date || null,
      reserved_time: row.reserved_time || null,
      status: row.status || null,
      note: row.doctor_note || null,
      prescription_menu: row.prescription_menu || null,
      answers: answers
    });

  if (insertError) {
    console.log(`    ❌ 失敗: ${insertError.message}`);
    failed++;
  } else {
    console.log(`    ✅ 成功`);
    fixed++;
  }

  await new Promise(resolve => setTimeout(resolve, 200));
}

console.log('\n=== 補完結果 ===');
console.log(`成功: ${fixed}件`);
console.log(`失敗: ${failed}件`);

// 5. キャッシュ無効化
if (fixed > 0) {
  console.log('\n5. キャッシュ無効化中...');
  const ADMIN_TOKEN = envVars.ADMIN_TOKEN;
  const APP_BASE_URL = envVars.APP_BASE_URL || envVars.NEXT_PUBLIC_APP_URL;

  if (ADMIN_TOKEN && APP_BASE_URL) {
    for (const record of missingInSupabase) {
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

console.log(`\n完了時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);

if (fixed > 0) {
  console.log('\n⚠️ データ不整合が検出され自動補完しました');
  console.log('⚠️ 原因調査のためVercelログを確認してください');
  process.exit(1); // 異常終了（アラート用）
} else {
  process.exit(0); // 正常終了
}
