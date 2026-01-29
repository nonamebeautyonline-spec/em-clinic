// fix-587.mjs
// 患者20260101587のSupabaseデータを修正

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const patientId = "20260101587";

console.log(`=== 患者 ${patientId} のデータ修正 ===\n`);

try {
  // 1. 現在のデータを取得
  const { data: current, error: fetchError } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .single();

  if (fetchError) {
    console.error("❌ データ取得エラー:", fetchError);
    process.exit(1);
  }

  console.log("現在のデータ:");
  console.log("  patient_name:", current.patient_name || "(なし)");
  console.log("  answerer_id:", current.answerer_id || "(なし)");
  console.log("  line_id:", current.line_id || "(なし)");
  console.log("  answers.氏名:", current.answers?.氏名 || "(なし)");
  console.log("  answers.性別:", current.answers?.性別 || "(なし)");
  console.log("");

  // 2. GASシートの情報（get-587-from-gas.mjsの結果から）
  const masterInfo = {
    name: "奥野 大樹",
    sex: "男",
    birth: "1997-07-26",
    nameKana: "オクノ ダイキ",
    tel: "08093020726",
    answererId: "235581430",
    lineUserId: "Ufc4cbc79a92fa1322317b2c55ecb86e1"
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
    tel: masterInfo.tel || current.answers?.tel || ""
  };

  console.log("更新内容:");
  console.log("  patient_name:", masterInfo.name);
  console.log("  answerer_id:", masterInfo.answererId);
  console.log("  line_id:", masterInfo.lineUserId);
  console.log("  answers.氏名:", updatedAnswers.氏名);
  console.log("  answers.name:", updatedAnswers.name);
  console.log("  answers.性別:", updatedAnswers.性別);
  console.log("  answers.カナ:", updatedAnswers.カナ);
  console.log("  answers.電話番号:", updatedAnswers.電話番号);
  console.log("");

  // 4. Supabaseを更新
  const { error: updateError } = await supabase
    .from("intake")
    .update({
      patient_name: masterInfo.name,
      answerer_id: masterInfo.answererId || null,
      line_id: masterInfo.lineUserId || null,
      answers: updatedAnswers
    })
    .eq("patient_id", patientId);

  if (updateError) {
    console.error("❌ 更新エラー:", updateError);
    process.exit(1);
  }

  console.log("✅ 更新完了");

  // 5. 確認
  const { data: updated } = await supabase
    .from("intake")
    .select("patient_name, answerer_id, line_id, answers")
    .eq("patient_id", patientId)
    .single();

  console.log("\n更新後のデータ:");
  console.log("  patient_name:", updated.patient_name);
  console.log("  answerer_id:", updated.answerer_id || "(なし)");
  console.log("  line_id:", updated.line_id || "(なし)");
  console.log("  answers.氏名:", updated.answers?.氏名);
  console.log("  answers.name:", updated.answers?.name);
  console.log("  answers.性別:", updated.answers?.性別);
  console.log("  answers.カナ:", updated.answers?.カナ);
  console.log("  answers.電話番号:", updated.answers?.電話番号);

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
