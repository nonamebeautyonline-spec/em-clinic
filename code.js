
// ==========================================
// 一時関数: 予約シートのヘッダーを確認
// ==========================================
function checkReservationHeaders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const reserveSheet = ss.getSheetByName(SHEET_NAME_RESERVE);
  
  if (!reserveSheet) {
    Logger.log("予約シートが見つかりません");
    return;
  }
  
  Logger.log("=== 予約シートのヘッダー ===");
  
  const values = reserveSheet.getDataRange().getValues();
  const headers = values[0];
  
  for (let i = 0; i < headers.length; i++) {
    Logger.log("列" + i + " (" + String.fromCharCode(65 + i) + "列): " + headers[i]);
  }
  
  Logger.log("\n=== データ例（2行目） ===");
  if (values.length > 1) {
    const row2 = values[1];
    for (let i = 0; i < row2.length && i < 10; i++) {
      Logger.log("列" + i + ": " + row2[i]);
    }
  }
  
  Logger.log("\n=== 完了 ===");
}
