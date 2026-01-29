// sample-backfilled-record.mjs
// バックフィルされた患者の1件をサンプル表示

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== バックフィルされた患者のサンプルレコード ===\n");

try {
  // バックフィルされた患者から1件取得
  const { data, error } = await supabase
    .from("intake")
    .select("*")
    .gte("created_at", "2026-01-28T06:30:00Z")
    .lte("created_at", "2026-01-28T07:00:00Z")
    .limit(1);

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  if (data.length === 0) {
    console.log("データが見つかりません");
    process.exit(0);
  }

  const record = data[0];

  console.log("Patient ID:", record.patient_id);
  console.log("Created at:", new Date(record.created_at).toLocaleString("ja-JP"));
  console.log("Patient name:", record.patient_name);
  console.log("Answerer ID:", record.answerer_id);
  console.log("\nAnswers object:");
  console.log(JSON.stringify(record.answers, null, 2));

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
