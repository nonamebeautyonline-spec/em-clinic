// create-missing-3.mjs
// 3人の欠損患者をSupabaseに一括作成

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

console.log('=== 3人の欠損患者をSupabaseに作成 ===\n');

// GASから最新データ取得
const gasRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

const targetPids = ["20260101541", "20260101551", "20251200673"];

let created = 0;
let failed = 0;

for (const pid of targetPids) {
  const row = gasRows.find(r => String(r.patient_id || '').trim() === pid);

  if (!row) {
    console.log(`❌ ${pid}: GASに見つかりません`);
    failed++;
    continue;
  }

  // birth をフォーマット (YYYY-MM-DD)
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

  console.log(`作成: ${pid} - ${row.name}`);
  console.log(`  answerer_id: ${row.answerer_id}`);
  console.log(`  line_id: ${row.line_id}`);
  console.log(`  reserve_id: ${row.reserveId}`);
  console.log(`  reserved: ${row.reserved_date} ${row.reserved_time}`);

  // Supabaseに挿入
  const { error: insertError } = await supabase
    .from('intake')
    .insert({
      patient_id: String(pid),
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
    console.error(`  ❌ 作成失敗: ${insertError.message}`);
    failed++;
  } else {
    console.log(`  ✅ 作成成功\n`);
    created++;
  }

  await new Promise(resolve => setTimeout(resolve, 200));
}

console.log('\n=== 結果 ===');
console.log(`作成成功: ${created}件`);
console.log(`作成失敗: ${failed}件`);

// キャッシュ無効化
if (created > 0) {
  console.log('\nキャッシュ無効化中...');
  const ADMIN_TOKEN = envVars.ADMIN_TOKEN;
  const APP_BASE_URL = envVars.APP_BASE_URL || envVars.NEXT_PUBLIC_APP_URL;

  if (ADMIN_TOKEN && APP_BASE_URL) {
    for (const pid of targetPids) {
      try {
        await fetch(`${APP_BASE_URL}/api/admin/invalidate-cache`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ patient_id: pid })
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
