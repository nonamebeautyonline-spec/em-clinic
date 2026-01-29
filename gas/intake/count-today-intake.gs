// 問診シートで今日（2026-01-27）の予約が何件あるか確認
function countTodayIntake() {
  const targetDate = "2026-01-27";

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const qSheet = ss.getSheetByName(SHEET_NAME_INTAKE);

  const lastRow = qSheet.getLastRow();
  const allData = qSheet.getRange(2, 1, lastRow - 1, 27).getValues();

  Logger.log("=== Counting today's intake records ===");
  Logger.log("Target date: " + targetDate);
  Logger.log("Total rows in sheet: " + (lastRow - 1));

  let count = 0;
  let withReservedDate = 0;
  let withoutReservedDate = 0;
  let matchingRecords = [];

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const reservedDateRaw = row[7]; // H列 (reserved_date)

    // 日付を正規化
    let reservedDate = "";
    if (reservedDateRaw) {
      if (reservedDateRaw instanceof Date) {
        // Dateオブジェクトの場合、YYYY-MM-DD形式に変換
        const year = reservedDateRaw.getFullYear();
        const month = String(reservedDateRaw.getMonth() + 1).padStart(2, '0');
        const day = String(reservedDateRaw.getDate()).padStart(2, '0');
        reservedDate = year + "-" + month + "-" + day;
      } else {
        reservedDate = String(reservedDateRaw).trim();
      }
    }

    if (reservedDate === targetDate) {
      count++;
      withReservedDate++;

      const pid = normPid_(row[25]); // Z列 (patient_id)
      const reserveId = (row[1] || "").toString().trim(); // B列
      const name = (row[3] || "").toString().trim(); // D列
      const reservedTime = (row[8] || "").toString().trim(); // I列
      const status = (row[19] || "").toString().trim(); // T列

      matchingRecords.push({
        row: i + 2,
        patient_id: pid,
        reserve_id: reserveId,
        name: name,
        reserved_time: reservedTime,
        status: status
      });
    }
  }

  Logger.log("\n=== Results ===");
  Logger.log("Records with reserved_date = " + targetDate + ": " + withReservedDate);
  Logger.log("\n=== Matching records ===");

  // 時刻順にソート
  matchingRecords.sort(function(a, b) {
    if (a.reserved_time < b.reserved_time) return -1;
    if (a.reserved_time > b.reserved_time) return 1;
    return 0;
  });

  for (let i = 0; i < matchingRecords.length; i++) {
    const rec = matchingRecords[i];
    Logger.log((i + 1) + ". " + rec.reserved_time + " - " + rec.name + " (" + rec.patient_id + ") reserve_id: " + rec.reserve_id + " status: " + rec.status);
  }

  Logger.log("\n=== Summary ===");
  Logger.log("Total today's records in intake sheet: " + withReservedDate);
}
