// fix-593.mjs
// patient_id: 20260101593のSupabaseデータを修正

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

const patientId = "20260101593";

console.log(`=== Patient ID: ${patientId} の修正 ===\n`);

try {
  // 1. 現在のデータを取得
  const { data: current } = await supabase
    .from('intake')
    .select('patient_name, answerer_id, line_id, answers')
    .eq('patient_id', patientId)
    .single();

  console.log("現在のデータ:");
  console.log("  patient_name:", current.patient_name || "(なし)");
  console.log("  answerer_id:", current.answerer_id || "(なし)");
  console.log("  line_id:", current.line_id || "(なし)");
  console.log("");

  // 2. GASシートの情報
  const masterInfo = {
    name: "木村 春佳",
    sex: "女",
    birth: "2004-04-06",
    nameKana: "キムラ ハルカ",
    tel: "09086124060",
    answererId: "235591702",
    lineUserId: "U9215e41521c695c6015b4bf006dbd26d"
  };

  // 3. answersをマージ
  const updatedAnswers = {
    ...current.answers,
    氏名: masterInfo.name,
    name: masterInfo.name,
    性別: masterInfo.sex || current.answers?.性別 || "",
    sex: masterInfo.sex || current.answers?.sex || "",
    生年月日: masterInfo.birth || current.answers?.生年月日 || "",
    birth: masterInfo.birth || current.answers?.birth || "",
    カナ: masterInfo.nameKana || current.answers?.カナ || "",
    name_kana: masterInfo.nameKana || current.answers?.name_kana || "",
    電話番号: masterInfo.tel || current.answers?.電話番号 || "",
    tel: masterInfo.tel || current.answers?.tel || "",
    answerer_id: masterInfo.answererId || current.answers?.answerer_id || "",
    line_id: masterInfo.lineUserId || current.answers?.line_id || ""
  };

  console.log("更新内容:");
  console.log("  patient_name:", masterInfo.name);
  console.log("  answerer_id:", masterInfo.answererId);
  console.log("  line_id:", masterInfo.lineUserId);
  console.log("");

  // 4. Supabaseを更新
  const { error: updateError } = await supabase
    .from('intake')
    .update({
      patient_name: masterInfo.name,
      answerer_id: masterInfo.answererId || null,
      line_id: masterInfo.lineUserId || null,
      answers: updatedAnswers
    })
    .eq('patient_id', patientId);

  if (updateError) {
    console.error("❌ 更新エラー:", updateError.message);
    process.exit(1);
  }

  console.log("✅ 更新完了");

  // 5. 確認
  const { data: updated } = await supabase
    .from('intake')
    .select('patient_name, answerer_id, line_id')
    .eq('patient_id', patientId)
    .single();

  console.log("\n更新後のデータ:");
  console.log("  patient_name:", updated.patient_name);
  console.log("  answerer_id:", updated.answerer_id);
  console.log("  line_id:", updated.line_id ? 'あり' : '(なし)');

  // 6. キャッシュ無効化
  console.log("\n6. キャッシュ無効化中...");
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

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
