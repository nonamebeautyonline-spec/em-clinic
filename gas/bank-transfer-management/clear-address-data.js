// 住所情報シートのテストデータ以外を削除する関数
function clearAddressDataExceptTest() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("BANK_TRANSFER_SHEET_ID");

  if (!sheetId) {
    Logger.log("❌ BANK_TRANSFER_SHEET_ID not set");
    return;
  }

  var ss = SpreadsheetApp.openById(sheetId);

  // 対象シート名のリスト
  var sheetNames = [
    "2025-12 住所情報",
    "2026-01 住所情報"
  ];

  var totalDeleted = 0;

  for (var i = 0; i < sheetNames.length; i++) {
    var sheetName = sheetNames[i];
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log("⚠️  シートが見つかりません: " + sheetName);
      continue;
    }

    Logger.log("\n=== " + sheetName + " 処理中 ===");

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log("データがありません（ヘッダーのみ）");
      continue;
    }

    // 全データを取得
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

    // 削除する行を特定（TESTで始まらないpatient_id）
    var rowsToDelete = [];

    for (var j = 0; j < data.length; j++) {
      var patientId = String(data[j][2] || "").trim(); // C列（患者ID、インデックス2）

      if (patientId && !patientId.startsWith("TEST")) {
        rowsToDelete.push(j + 2); // 行番号（ヘッダー分+1、0-based補正+1）
      }
    }

    if (rowsToDelete.length === 0) {
      Logger.log("削除対象なし（全てテストデータまたは空行）");
      continue;
    }

    Logger.log("削除対象: " + rowsToDelete.length + " 件");

    // 降順で削除（後ろから削除しないと行番号がずれる）
    rowsToDelete.sort(function(a, b) { return b - a; });

    for (var k = 0; k < rowsToDelete.length; k++) {
      sheet.deleteRow(rowsToDelete[k]);
    }

    totalDeleted += rowsToDelete.length;
    Logger.log("✅ " + rowsToDelete.length + " 件削除完了");
  }

  Logger.log("\n=== 全体完了 ===");
  Logger.log("合計削除: " + totalDeleted + " 件");

  SpreadsheetApp.getUi().alert(
    "データ削除完了\n\n" +
    "合計 " + totalDeleted + " 件のデータを削除しました。\n" +
    "（TESTで始まる患者IDは保持）"
  );
}
