// check-sheet-id.js
// REORDER_SHEET_ID を確認するテスト関数

function checkReorderSheetId() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("REORDER_SHEET_ID");
  var sheetName = props.getProperty("REORDER_SHEET_NAME") || "シート1";

  Logger.log("=== Reorder GAS Script Properties ===");
  Logger.log("REORDER_SHEET_ID: " + sheetId);
  Logger.log("REORDER_SHEET_NAME: " + sheetName);

  if (sheetId) {
    try {
      var ss = SpreadsheetApp.openById(sheetId);
      Logger.log("Spreadsheet Name: " + ss.getName());
      Logger.log("Spreadsheet URL: " + ss.getUrl());

      var sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        Logger.log("Sheet found: " + sheetName);
        Logger.log("Last row: " + sheet.getLastRow());
      }
    } catch (e) {
      Logger.log("Error opening sheet: " + e);
    }
  } else {
    Logger.log("REORDER_SHEET_ID is not set!");
  }
}
