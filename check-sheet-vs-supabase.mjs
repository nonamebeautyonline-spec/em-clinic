import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 問診シート vs Supabase 件数比較 ===\n");

try {
  const { count: supabaseCount, error: countError } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("❌ Supabaseクエリエラー:", countError);
    process.exit(1);
  }

  console.log("Supabase件数: " + supabaseCount + "件");
  console.log("問診シート行数: 2571行（ヘッダー除くと2570件）");

  const diff = 2570 - supabaseCount;
  if (diff > 0) {
    console.log("\n⚠️  差分: " + diff + "件がSupabaseに同期されていません");
  } else if (diff < 0) {
    console.log("\n⚠️  Supabaseの方が" + Math.abs(diff) + "件多い（重複または削除済みシート行）");
  } else {
    console.log("\n✅ 件数は一致しています");
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
