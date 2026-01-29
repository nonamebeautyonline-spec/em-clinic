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
console.log("  answerer_id (top):", current.answerer_id);
console.log("  line_id (top):", current.line_id);
console.log("  answerer_id (answers):", current.answers.answerer_id);
console.log("  line_id (answers):", current.answers.line_id);

// answersとトップレベルを修正
const updatedAnswers = {
  ...current.answers,
  answerer_id: "234384532",
  line_id: "U24047f93596a5b30882efc83a9fa8005",
};

const { data, error } = await supabase
  .from("intake")
  .update({
    answerer_id: "234384532",
    line_id: "U24047f93596a5b30882efc83a9fa8005",
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
console.log("  answerer_id (top):", data.answerer_id);
console.log("  line_id (top):", data.line_id);
console.log("  answerer_id (answers):", data.answers.answerer_id);
console.log("  line_id (answers):", data.answers.line_id);
console.log("\n✅ 修正完了");
