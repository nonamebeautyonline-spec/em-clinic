import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 現在のデータを取得
const { data: current, error: fetchError } = await supabase
  .from("intake")
  .select("*")
  .eq("patient_id", "20260101586")
  .single();

if (fetchError) {
  console.error("取得エラー:", fetchError);
  process.exit(1);
}

console.log("修正前:");
console.log("  カナ:", current.answers.カナ || current.answers.name_kana || "(なし)");
console.log("  性別:", current.answers.性別 || current.answers.sex);

// answersを修正
const updatedAnswers = {
  ...current.answers,
  カナ: "アカガキヨリコ",
  name_kana: "アカガキヨリコ",
  性別: "女",
  sex: "女",
  電話番号: "08027869204",
  tel: "08027869204",
};

// 更新
const { data, error } = await supabase
  .from("intake")
  .update({
    answers: updatedAnswers
  })
  .eq("patient_id", "20260101586")
  .select()
  .single();

if (error) {
  console.error("更新エラー:", error);
  process.exit(1);
}

console.log("\n修正後:");
console.log("  カナ:", data.answers.カナ);
console.log("  性別:", data.answers.性別);
console.log("  電話番号:", data.answers.電話番号);
console.log("\n✅ Supabase修正完了");
