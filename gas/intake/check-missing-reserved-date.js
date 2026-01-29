// reserved_dateがnullのpatient_idについて問診シートを確認
function checkMissingReservedDate() {
  const targetPids = [
    "20260101478",
    "20260101477",
    "20260100909",
    "20260101335",
    "20260100337",
    "20260101173",
    "20251201054"
  ];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const qSheet = ss.getSheetByName(SHEET_NAME_INTAKE);

  const lastRow = qSheet.getLastRow();
  const allData = qSheet.getRange(2, 1, lastRow - 1, 27).getValues();

  Logger.log("=== Checking missing reserved_date ===");

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const pid = normPid_(row[25]); // Z列

    if (!targetPids.includes(pid)) continue;

    Logger.log("\n========================================");
    Logger.log("Row: " + (i + 2));
    Logger.log("patient_id (Z): " + pid);
    Logger.log("reserve_id (B): " + row[1]);
    Logger.log("name (D): " + row[3]);
    Logger.log("reserved_date (H): " + row[7]);
    Logger.log("reserved_time (I): " + row[8]);
    Logger.log("status (T): " + row[19]);
    Logger.log("========================================");
  }

  Logger.log("\n=== Check complete ===");
}
