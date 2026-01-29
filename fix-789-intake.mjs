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

const pid = '20260100789';
console.log(`=== Patient ${pid} のintakeを作成 ===\n`);

// GAS
const gasRes = await fetch(envVars.GAS_INTAKE_LIST_URL);
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;
const row = gasRows.find(r => String(r.patient_id || '').trim() === pid);

if (!row) {
  console.error('❌ GASに見つかりません');
  process.exit(1);
}

console.log('GASデータ:');
console.log('  name:', row.name);
console.log('  answerer_id:', row.answerer_id);
console.log('  line_id:', row.line_id);
console.log('  reserved:', row.reserved_date, row.reserved_time);

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

console.log('\nSupabaseに挿入中...');
const { error } = await supabase
  .from('intake')
  .insert({
    patient_id: pid,
    patient_name: row.name || null,
    answerer_id: String(row.answerer_id) || null,
    line_id: row.line_id || null,
    reserve_id: row.reserveId || row.reserved || null,
    reserved_date: row.reserved_date || null,
    reserved_time: row.reserved_time || null,
    status: row.status || null,
    note: row.doctor_note || null,
    prescription_menu: row.prescription_menu || null,
    answers: answers
  });

if (error) {
  console.error('❌ 挿入失敗:', error.message);
  console.error('詳細:', error);
} else {
  console.log('✅ 挿入成功');
}

const ADMIN_TOKEN = envVars.ADMIN_TOKEN;
const APP_BASE_URL = envVars.APP_BASE_URL || envVars.NEXT_PUBLIC_APP_URL;

if (ADMIN_TOKEN && APP_BASE_URL) {
  await fetch(`${APP_BASE_URL}/api/admin/invalidate-cache`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ patient_id: pid })
  });
  console.log('✅ キャッシュ無効化完了');
}
