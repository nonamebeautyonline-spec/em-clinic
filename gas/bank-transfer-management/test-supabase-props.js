// GASのScript Propertiesを確認するテスト関数
function testSupabaseProps() {
  var props = PropertiesService.getScriptProperties();
  var supabaseUrl = props.getProperty("SUPABASE_URL");
  var supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  Logger.log("=== Script Properties 確認 ===");
  Logger.log("SUPABASE_URL: " + (supabaseUrl ? "SET (" + supabaseUrl.substring(0, 30) + "...)" : "NOT SET"));
  Logger.log("SUPABASE_ANON_KEY: " + (supabaseKey ? "SET (長さ: " + supabaseKey.length + ")" : "NOT SET"));

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("\n❌ SUPABASE_URLまたはSUPABASE_ANON_KEYが設定されていません");
    Logger.log("GASエディタで以下を設定してください:");
    Logger.log("1. プロジェクト設定 → スクリプト プロパティ");
    Logger.log("2. SUPABASE_URL = https://your-project.supabase.co");
    Logger.log("3. SUPABASE_ANON_KEY = your-anon-key");
    return;
  }

  Logger.log("\n✅ Script Propertiesは正常に設定されています");
  Logger.log("\n=== 氏名取得テスト ===");

  // テスト用患者ID（実際の患者IDに置き換えてください）
  var testPatientId = "20251200394";
  var name = getPatientNameFromSupabase_(testPatientId);

  if (name) {
    Logger.log("✅ 氏名取得成功: " + testPatientId + " = " + name);
  } else {
    Logger.log("❌ 氏名が見つかりませんでした: " + testPatientId);
  }
}
