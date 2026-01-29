import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Supabase intakeテーブルの件数確認 ===\n");

try {
  const { count, error } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  console.log(`全件数: ${count}件`);

  if (count > 1000) {
    console.log(`\n⚠️  1000件を超えています (${count - 1000}件が未チェック)`);
    console.log("fix-missing-names.jsのlimitを調整する必要があります");
  } else {
    console.log("\n✅ 1000件以内なので、全件チェック済みです");
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
