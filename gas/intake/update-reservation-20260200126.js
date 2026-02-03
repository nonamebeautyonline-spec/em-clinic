/**
 * 患者20260200126の問診シートに予約情報を書き込む
 */
function updateReservation20260200126() {
  const SPREADSHEET_ID = "1sDvZg1SWLbdv3XRhEYgDT1CJQ7lL9JcfM40lk7tL0As";
  const SHEET_NAME = "問診";

  const TARGET_PATIENT_ID = "20260200126";
  const RESERVE_ID = "resv-1770084040110";
  const RESERVED_DATE = "2026-02-03";
  const RESERVED_TIME = "12:15";

  const COL_RESERVE_ID = 2;    // B列
  const COL_RESERVED_DATE = 8;  // H列
  const COL_RESERVED_TIME = 9;  // I列
  const COL_PATIENT_ID = 26;    // Z列

  Logger.log("=".repeat(70));
  Logger.log("患者 " + TARGET_PATIENT_ID + " の予約情報を問診シートに書き込み");
  Logger.log("=".repeat(70));

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      Logger.log("❌ シートが見つかりません: " + SHEET_NAME);
      return;
    }

    Logger.log("✅ シート取得成功: " + SHEET_NAME);

    // 全データを取得
    const lastRow = sheet.getLastRow();
    Logger.log("総行数: " + lastRow);

    if (lastRow < 2) {
      Logger.log("❌ データがありません");
      return;
    }

    // Z列（patient_id）とB,H,I列を取得
    const values = sheet.getRange(2, 1, lastRow - 1, 26).getValues();

    let found = false;
    for (let i = 0; i < values.length; i++) {
      const patientId = String(values[i][COL_PATIENT_ID - 1] || "").trim();

      if (patientId === TARGET_PATIENT_ID) {
        const rowNum = i + 2; // ヘッダー分+1、配列は0始まり

        Logger.log("\n✅ 患者を発見: 行 " + rowNum);

        // 現在の値を確認
        const currentReserveId = String(values[i][COL_RESERVE_ID - 1] || "");
        const currentReservedDate = values[i][COL_RESERVED_DATE - 1] || "";
        const currentReservedTime = values[i][COL_RESERVED_TIME - 1] || "";

        Logger.log("現在の値:");
        Logger.log("  reserve_id: " + currentReserveId);
        Logger.log("  reserved_date: " + currentReservedDate);
        Logger.log("  reserved_time: " + currentReservedTime);

        // 予約情報を書き込み
        sheet.getRange(rowNum, COL_RESERVE_ID).setValue(RESERVE_ID);
        sheet.getRange(rowNum, COL_RESERVED_DATE).setValue(RESERVED_DATE);
        sheet.getRange(rowNum, COL_RESERVED_TIME).setValue(RESERVED_TIME);

        Logger.log("\n✅ 予約情報を書き込みました:");
        Logger.log("  reserve_id: " + RESERVE_ID);
        Logger.log("  reserved_date: " + RESERVED_DATE);
        Logger.log("  reserved_time: " + RESERVED_TIME);

        found = true;
        break;
      }
    }

    if (!found) {
      Logger.log("\n❌ 患者が見つかりませんでした: " + TARGET_PATIENT_ID);
    } else {
      Logger.log("\n" + "=".repeat(70));
      Logger.log("✅ 処理完了");
      Logger.log("=".repeat(70));
    }

  } catch (err) {
    Logger.log("❌ エラー: " + err);
    Logger.log(err.stack);
  }
}
