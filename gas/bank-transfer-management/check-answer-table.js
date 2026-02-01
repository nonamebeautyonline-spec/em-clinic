// Supabase answerテーブルの構造を確認
function checkAnswerTableStructure() {
  var props = PropertiesService.getScriptProperties();
  var supabaseUrl = props.getProperty("SUPABASE_URL");
  var supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("❌ SUPABASE_URL or SUPABASE_ANON_KEY not set");
    return;
  }

  Logger.log("=== Supabase Answer Table Structure Check ===");
  Logger.log("Supabase URL: " + supabaseUrl);

  // 1件だけ取得して構造を確認
  var url = supabaseUrl + "/rest/v1/answer?limit=1";

  try {
    var response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    var body = response.getContentText();

    Logger.log("\nResponse Code: " + code);

    if (code === 200) {
      var data = JSON.parse(body);
      Logger.log("\n✅ Success! Got " + data.length + " record(s)");

      if (data.length > 0) {
        Logger.log("\n=== Column Names ===");
        var firstRow = data[0];
        var columns = Object.keys(firstRow);

        for (var i = 0; i < columns.length; i++) {
          var col = columns[i];
          var value = firstRow[col];
          var valueStr = (value !== null && value !== undefined) ? String(value).substring(0, 50) : "null";
          Logger.log((i + 1) + ". " + col + " = " + valueStr);
        }

        Logger.log("\n=== 使用すべき列名 ===");
        Logger.log("patient_id列: " + (columns.indexOf("patient_id") >= 0 ? "patient_id" : "患者ID または別の列名"));
        Logger.log("氏名列: q1 または 別の列名");
      } else {
        Logger.log("⚠️ No data in answer table");
      }
    } else {
      Logger.log("❌ Error: " + code);
      Logger.log("Response: " + body);
    }
  } catch (e) {
    Logger.log("❌ Exception: " + e);
  }

  Logger.log("\n=== Test with specific patient_id ===");
  // テスト用患者IDで検索
  var testPid = "20251200394";
  var searchUrl = supabaseUrl + "/rest/v1/answer?patient_id=eq." + testPid + "&limit=1";

  try {
    var response2 = UrlFetchApp.fetch(searchUrl, {
      method: "get",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    });

    var code2 = response2.getResponseCode();
    var body2 = response2.getContentText();

    Logger.log("Search for patient_id=" + testPid);
    Logger.log("Response Code: " + code2);
    Logger.log("Response: " + body2.substring(0, 200));
  } catch (e) {
    Logger.log("Search error: " + e);
  }
}
