// 問診シートの行数を確認
function checkIntakeRowCount() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const qSheet = ss.getSheetByName(SHEET_NAME_INTAKE);

  if (!qSheet) {
    Logger.log("ERROR: Sheet not found: " + SHEET_NAME_INTAKE);
    return;
  }

  const lastRow = qSheet.getLastRow();
  const totalRows = lastRow - 1; // ヘッダー除く

  Logger.log("=== Intake Sheet Row Count ===");
  Logger.log("Total rows (including header): " + lastRow);
  Logger.log("Data rows (excluding header): " + totalRows);
  Logger.log("");
  Logger.log("=== Batch Recommendations ===");
  Logger.log("For 100 rows per batch: " + Math.ceil(totalRows / 100) + " batches needed");
  Logger.log("For 200 rows per batch: " + Math.ceil(totalRows / 200) + " batches needed");
  Logger.log("For 500 rows per batch: " + Math.ceil(totalRows / 500) + " batches needed");
  Logger.log("");
  Logger.log("=== Execution Commands ===");
  Logger.log("Batch 1 (rows 1-100): syncAllIntakeToSupabase(0, 100)");
  Logger.log("Batch 2 (rows 101-200): syncAllIntakeToSupabase(100, 100)");
  Logger.log("Batch 3 (rows 201-300): syncAllIntakeToSupabase(200, 100)");
  Logger.log("...");
  Logger.log("");
  Logger.log("Or run all at once (may timeout if > 1000 rows):");
  Logger.log("syncAllIntakeToSupabaseOneShot()");
}
