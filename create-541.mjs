// create-541.mjs
// patient_id: 20260101541をSupabaseに新規作成

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

const patientId = "20260101541";

console.log(`=== Patient ID: ${patientId} をSupabaseに作成 ===\n`);

// GASシートの情報
const masterInfo = {
  name: "久保田　理恵",
  sex: "女",
  birth: "1989-08-21",
  nameKana: "クボタ　リエ",
  tel: "9028308574",
  answererId: "234558702",
  lineUserId: "U7715cc5a6cc0933ac9277fa1c2883f10"
};

const answers = {
  氏名: masterInfo.name,
  name: masterInfo.name,
  性別: masterInfo.sex,
  sex: masterInfo.sex,
  生年月日: masterInfo.birth,
  birth: masterInfo.birth,
  カナ: masterInfo.nameKana,
  name_kana: masterInfo.nameKana,
  電話番号: masterInfo.tel,
  tel: masterInfo.tel,
  answerer_id: masterInfo.answererId,
  line_id: masterInfo.lineUserId
};

console.log("作成内容:");
console.log("  patient_id:", patientId);
console.log("  patient_name:", masterInfo.name);
console.log("  answerer_id:", masterInfo.answererId);
console.log("  line_id:", masterInfo.lineUserId);
console.log("");

// Supabaseに新規作成
const { error: insertError } = await supabase
  .from('intake')
  .insert({
    patient_id: patientId,
    patient_name: masterInfo.name,
    answerer_id: masterInfo.answererId || null,
    line_id: masterInfo.lineUserId || null,
    reserve_id: null,
    reserved_date: null,
    reserved_time: null,
    status: null,
    note: null,
    prescription_menu: null,
    answers: answers
  });

if (insertError) {
  console.error("❌ 作成エラー:", insertError.message);
  process.exit(1);
}

console.log("✅ 作成完了");

// 確認
const { data: created } = await supabase
  .from('intake')
  .select('patient_id, patient_name, answerer_id, line_id')
  .eq('patient_id', patientId)
  .single();

console.log("\n作成後のデータ:");
console.log("  patient_name:", created.patient_name);
console.log("  answerer_id:", created.answerer_id);
console.log("  line_id:", created.line_id ? 'あり' : '(なし)');

// キャッシュ無効化
console.log("\nキャッシュ無効化中...");
const ADMIN_TOKEN = envVars.ADMIN_TOKEN;
const APP_BASE_URL = envVars.APP_BASE_URL || envVars.NEXT_PUBLIC_APP_URL;

if (ADMIN_TOKEN && APP_BASE_URL) {
  const cacheRes = await fetch(`${APP_BASE_URL}/api/admin/invalidate-cache`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ patient_id: patientId })
  });

  if (cacheRes.ok) {
    console.log("✅ キャッシュ無効化完了");
  }
}

console.log("\n完了しました。");
