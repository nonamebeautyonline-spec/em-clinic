// 特定のpatient_idの問診シートデータを確認
function checkSpecificPatients() {
  const targetPids = ["20260101472", "20260101475"];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const qSheet = ss.getSheetByName(SHEET_NAME_INTAKE);

  const lastRow = qSheet.getLastRow();
  const allData = qSheet.getRange(2, 1, lastRow - 1, 26).getValues();

  Logger.log("=== Checking specific patients ===");

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
    Logger.log("\n--- Answers (J-S) ---");
    Logger.log("J (ng_check): " + row[9]);
    Logger.log("K (current_disease_yesno): " + row[10]);
    Logger.log("L (current_disease_detail): " + row[11]);
    Logger.log("M (glp_history): " + row[12]);
    Logger.log("N (med_yesno): " + row[13]);
    Logger.log("O (med_detail): " + row[14]);
    Logger.log("P (allergy_yesno): " + row[15]);
    Logger.log("Q (allergy_detail): " + row[16]);
    Logger.log("R (entry_route): " + row[17]);
    Logger.log("S (entry_other): " + row[18]);
    Logger.log("========================================");
  }

  Logger.log("\n=== Check complete ===");
}
