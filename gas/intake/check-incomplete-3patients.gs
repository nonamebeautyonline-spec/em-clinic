// 不完全な3件のpatient_idについて問診シートのデータを確認
function checkIncomplete3Patients() {
  const targetPids = ["20260101480", "20260101481", "20260101482"];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const qSheet = ss.getSheetByName(SHEET_NAME_INTAKE);

  const lastRow = qSheet.getLastRow();
  const allData = qSheet.getRange(2, 1, lastRow - 1, 27).getValues();

  Logger.log("=== Checking incomplete 3 patients ===");

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const pid = normPid_(row[25]); // Z列 (patient_id)

    if (!targetPids.includes(pid)) continue;

    Logger.log("\n" + "=".repeat(80));
    Logger.log("Row: " + (i + 2));
    Logger.log("A (timestamp): " + row[0]);
    Logger.log("B (reserve_id): " + row[1]);
    Logger.log("C (created_at): " + row[2]);
    Logger.log("D (name): '" + row[3] + "'");
    Logger.log("E (sex): '" + row[4] + "'");
    Logger.log("F (birth): '" + row[5] + "'");
    Logger.log("G (line_id): '" + row[6] + "'");
    Logger.log("H (reserved_date): '" + row[7] + "'");
    Logger.log("I (reserved_time): '" + row[8] + "'");
    Logger.log("T (status): '" + row[19] + "'");
    Logger.log("U (note): '" + row[20] + "'");
    Logger.log("V (prescription_menu): '" + row[21] + "'");
    Logger.log("W (name_kana): '" + row[22] + "'");
    Logger.log("X (tel): '" + row[23] + "'");
    Logger.log("Y (answerer_id): '" + row[24] + "'");
    Logger.log("Z (patient_id): '" + pid + "'");
    Logger.log("\n--- Questionnaire Answers (J-S) ---");
    Logger.log("J (ng_check): '" + row[9] + "'");
    Logger.log("K (current_disease_yesno): '" + row[10] + "'");
    Logger.log("L (current_disease_detail): '" + row[11] + "'");
    Logger.log("M (glp_history): '" + row[12] + "'");
    Logger.log("N (med_yesno): '" + row[13] + "'");
    Logger.log("O (med_detail): '" + row[14] + "'");
    Logger.log("P (allergy_yesno): '" + row[15] + "'");
    Logger.log("Q (allergy_detail): '" + row[16] + "'");
    Logger.log("R (entry_route): '" + row[17] + "'");
    Logger.log("S (entry_other): '" + row[18] + "'");
    Logger.log("=".repeat(80));
  }

  Logger.log("\n=== Check complete ===");
}
