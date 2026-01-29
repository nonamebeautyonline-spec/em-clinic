import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from("intake")
  .select("*")
  .eq("patient_id", "20260101586")
  .single();

if (error) {
  console.error("エラー:", error);
  process.exit(1);
}

console.log("基本情報:");
console.log("  patient_name:", data.patient_name);
console.log("  answerer_id:", data.answerer_id);

console.log("\nanswers:");
const a = data.answers || {};
console.log("  氏名:", a.氏名 || a.name);
console.log("  カナ:", a.カナ || a.name_kana);
console.log("  性別:", a.性別 || a.sex);
console.log("  answerer_id (in answers):", a.answerer_id);
