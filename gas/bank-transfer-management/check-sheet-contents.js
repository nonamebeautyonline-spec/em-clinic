// 銀行振込管理シートの内容確認スクリプト
// 2026-01と2026-02の住所情報シートを確認

function checkSheetContents() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("BANK_TRANSFER_SHEET_ID");

  if (!sheetId) {
    Logger.log("❌ BANK_TRANSFER_SHEET_ID not set");
    return;
  }

  Logger.log("=== 銀行振込管理シート確認 ===");
  Logger.log("Sheet ID: " + sheetId);

  var ss = SpreadsheetApp.openById(sheetId);

  // 2026-01と2026-02の住所情報シートを確認
  var months = ["2026-01", "2026-02"];

  months.forEach(function(month) {
    var sheetName = month + " 住所情報";
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log("\n❌ シート「" + sheetName + "」が見つかりません");
      return;
    }

    Logger.log("\n=== " + sheetName + " ===");
    var lastRow = sheet.getLastRow();
    Logger.log("最終行: " + lastRow);

    if (lastRow < 2) {
      Logger.log("データなし（ヘッダーのみ）");
      return;
    }

    // ヘッダー表示
    var header = sheet.getRange(1, 1, 1, 13).getValues()[0];
    Logger.log("ヘッダー: " + JSON.stringify(header));

    // 全データ表示
    var data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();

    Logger.log("\n全 " + data.length + " 件:");
    data.forEach(function(row, index) {
      var rowNum = index + 2;
      var receivedAt = row[0];    // A: 受信日時
      var orderId = row[1];        // B: 注文ID
      var patientId = row[2];      // C: 患者ID
      var productCode = row[3];    // D: 商品コード
      var mode = row[4];           // E: モード
      var reorderId = row[5];      // F: 再購入ID
      var accountName = row[6];    // G: 口座名義
      var phoneNumber = row[7];    // H: 電話番号
      var email = row[8];          // I: メールアドレス
      var postalCode = row[9];     // J: 郵便番号
      var address = row[10];       // K: 住所
      var status = row[11];        // L: ステータス
      var submittedAt = row[12];   // M: 送信日時

      Logger.log("[" + rowNum + "] " +
                "受信:" + receivedAt +
                " | 注文ID:" + orderId +
                " | 患者ID:" + patientId +
                " | 商品:" + productCode +
                " | 名前:" + accountName);
    });
  });

  // 特定の患者を検索
  Logger.log("\n=== 特定患者の検索 ===");
  var targetPatients = ["20260101638", "20260101613"];

  targetPatients.forEach(function(targetPid) {
    Logger.log("\n患者ID: " + targetPid);
    var found = false;

    months.forEach(function(month) {
      var sheetName = month + " 住所情報";
      var sheet = ss.getSheetByName(sheetName);

      if (!sheet) return;

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;

      var data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();

      data.forEach(function(row, index) {
        var patientId = String(row[2] || "").trim();
        if (patientId === targetPid) {
          found = true;
          Logger.log("  ✅ 見つかりました: " + sheetName + " 行" + (index + 2));
          Logger.log("     受信日時: " + row[0]);
          Logger.log("     口座名義: " + row[6]);
          Logger.log("     住所: " + row[10]);
        }
      });
    });

    if (!found) {
      Logger.log("  ❌ 見つかりませんでした");
    }
  });

  Logger.log("\n=== 確認完了 ===");
}

// 実行用関数
function runCheck() {
  checkSheetContents();
}
