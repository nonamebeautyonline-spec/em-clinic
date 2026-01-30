// テスト関数：定数が正しく読み込まれているか確認
function testConstants() {
  Logger.log("SHEET_NAME_WEBHOOK: " + SHEET_NAME_WEBHOOK);
  Logger.log("SHEET_NAME_MASTER: " + SHEET_NAME_MASTER);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const webhookSheet = ss.getSheetByName(SHEET_NAME_WEBHOOK);
  const masterSheet = ss.getSheetByName(SHEET_NAME_MASTER);

  Logger.log("webhookSheet found: " + (webhookSheet !== null));
  Logger.log("masterSheet found: " + (masterSheet !== null));

  if (!webhookSheet) {
    Logger.log("Available sheets: " + ss.getSheets().map(s => s.getName()).join(", "));
  }
}
