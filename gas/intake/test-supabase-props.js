// test-supabase-props.js
// スクリプトプロパティのSupabase設定を確認

function testSupabaseProperties() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  Logger.log("=== Supabase Properties Test ===");
  Logger.log("SUPABASE_URL: " + (supabaseUrl ? "✅ Set (" + supabaseUrl.substring(0, 30) + "...)" : "❌ Missing"));
  Logger.log("SUPABASE_ANON_KEY: " + (supabaseKey ? "✅ Set (" + supabaseKey.substring(0, 30) + "...)" : "❌ Missing"));

  // 全てのプロパティキーを確認
  const allProps = props.getProperties();
  Logger.log("\n=== All Property Keys ===");
  for (const key in allProps) {
    if (key.toLowerCase().includes("supabase")) {
      Logger.log("Found: " + key);
    }
  }

  Logger.log("\n=== Test Complete ===");
}
