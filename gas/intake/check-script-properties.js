function checkScriptProperties() {
  const props = PropertiesService.getScriptProperties();

  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  Logger.log("=== Script Properties確認 ===");
  Logger.log("SUPABASE_URL: " + (supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "未設定"));
  Logger.log("SUPABASE_ANON_KEY: " + (supabaseKey ? supabaseKey.substring(0, 20) + "..." : "未設定"));

  // テスト接続
  if (!supabaseUrl || !supabaseKey) {
    Logger.log("❌ SUPABASE_URLまたはSUPABASE_ANON_KEYが設定されていません");
    return;
  }

  const url = supabaseUrl + "/rest/v1/intake?select=patient_id&limit=1";

  try {
    const res = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey
      },
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    Logger.log("Supabase接続テスト: " + code);

    if (code === 200) {
      Logger.log("✅ Supabase接続成功");
    } else {
      Logger.log("❌ Supabase接続失敗: " + res.getContentText());
    }
  } catch (e) {
    Logger.log("❌ 接続エラー: " + e);
  }
}
