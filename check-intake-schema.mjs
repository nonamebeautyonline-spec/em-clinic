import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// テーブル構造を確認
const { data, error } = await supabase
  .from("intake")
  .select("*")
  .limit(1);

if (error) {
  console.error("エラー:", error);
  process.exit(1);
}

if (data && data.length > 0) {
  const record = data[0];
  
  console.log("=== intakeテーブルのカラム ===\n");
  
  // トップレベルのカラム
  console.log("【トップレベルカラム】");
  const topLevelKeys = Object.keys(record).filter(k => k !== 'answers');
  topLevelKeys.forEach(key => {
    const value = record[key];
    const type = value === null ? 'null' : typeof value;
    console.log(`  ${key}: ${type}`);
  });
  
  // answersオブジェクトの中身
  console.log("\n【answers (JSONB) の中身】");
  if (record.answers) {
    const answerKeys = Object.keys(record.answers);
    console.log(`  全キー数: ${answerKeys.length}`);
    console.log("\n  含まれるフィールド:");
    answerKeys.forEach(key => {
      console.log(`    - ${key}`);
    });
  }
}
