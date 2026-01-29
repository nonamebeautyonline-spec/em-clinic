// テスト用：Script Propertiesを確認
function testSupabaseProps() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  Logger.log("=== Supabase Script Properties Check ===");
  Logger.log("SUPABASE_URL: " + (supabaseUrl ? "SET (length=" + supabaseUrl.length + ")" : "MISSING"));
  Logger.log("SUPABASE_ANON_KEY: " + (supabaseKey ? "SET (length=" + supabaseKey.length + ")" : "MISSING"));

  if (supabaseUrl) {
    Logger.log("URL value: " + supabaseUrl);
  }

  if (supabaseUrl && supabaseKey) {
    Logger.log("\n=== Testing Supabase Connection ===");
    try {
      const testUrl = supabaseUrl + "/rest/v1/intake?limit=1";
      const res = UrlFetchApp.fetch(testUrl, {
        method: "get",
        headers: {
          "apikey": supabaseKey,
          "Authorization": "Bearer " + supabaseKey
        },
        muteHttpExceptions: true
      });

      const code = res.getResponseCode();
      Logger.log("Test request status: " + code);

      if (code === 200) {
        Logger.log("✅ Connection successful");
      } else {
        Logger.log("❌ Connection failed: " + res.getContentText());
      }
    } catch (e) {
      Logger.log("❌ Connection error: " + e);
    }
  }

  Logger.log("=== Test Complete ===");
}
