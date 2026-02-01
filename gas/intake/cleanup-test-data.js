// gas/intake/cleanup-test-data.js
// テストデータ削除用スクリプト

// 列番号定数（直接定義）
var SPREADSHEET_ID_CLEANUP = "1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo";
var SHEET_NAME_INTAKE_CLEANUP = "問診";
var SHEET_NAME_MASTER_CLEANUP = "問診マスター";
var COL_PATIENT_ID_INTAKE_CLEANUP = 26; // Z列
var COL_PATIENT_ID_MASTER_CLEANUP = 12; // L列

// ★ まずテストデータをリストアップして確認
function listTestData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CLEANUP);

  Logger.log("=== テストデータ確認 ===");

  // 1. 問診シート
  var intakeSheet = ss.getSheetByName(SHEET_NAME_INTAKE_CLEANUP);
  if (intakeSheet) {
    var testIntakes = findTestRows(intakeSheet, COL_PATIENT_ID_INTAKE_CLEANUP);
    Logger.log("【問診シート】 " + testIntakes.length + "件");
    for (var i = 0; i < testIntakes.length; i++) {
      var row = testIntakes[i];
      Logger.log("  Row " + row.rowNumber + ": " + row.patientId + " (" + row.name + ")");
    }
  }

  // 2. 予約シート
  var reservationSheet = ss.getSheetByName("予約");
  if (reservationSheet) {
    var testReservations = findTestRows(reservationSheet, 3); // C列 = 3
    Logger.log("");
    Logger.log("【予約シート】 " + testReservations.length + "件");
    for (var i = 0; i < testReservations.length; i++) {
      var row = testReservations[i];
      Logger.log("  Row " + row.rowNumber + ": " + row.patientId + " (" + row.date + " " + row.time + ")");
    }
  }

  // 3. 問診マスター
  var masterSheet = ss.getSheetByName(SHEET_NAME_MASTER_CLEANUP);
  if (masterSheet) {
    var testMasters = findTestRows(masterSheet, COL_PATIENT_ID_MASTER_CLEANUP);
    Logger.log("");
    Logger.log("【問診マスター】 " + testMasters.length + "件");
    for (var i = 0; i < testMasters.length; i++) {
      var row = testMasters[i];
      Logger.log("  Row " + row.rowNumber + ": " + row.patientId + " (" + row.name + ")");
    }
  }

  Logger.log("");
  Logger.log("実行方法: deleteTestData() を実行してください");
}

// ★ テストデータを削除
function deleteTestData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CLEANUP);
  var totalDeleted = 0;

  Logger.log("=== テストデータ削除開始 ===");

  // 1. 問診シート
  var intakeSheet = ss.getSheetByName(SHEET_NAME_INTAKE_CLEANUP);
  if (intakeSheet) {
    var deleted1 = deleteRowsByPattern(intakeSheet, COL_PATIENT_ID_INTAKE_CLEANUP, "TEST_");
    Logger.log("【問診シート】 " + deleted1 + "件削除");
    totalDeleted += deleted1;
  }

  // 2. 予約シート
  var reservationSheet = ss.getSheetByName("予約");
  if (reservationSheet) {
    var deleted2 = deleteRowsByPattern(reservationSheet, 3, "TEST_");
    Logger.log("【予約シート】 " + deleted2 + "件削除");
    totalDeleted += deleted2;
  }

  // 3. 問診マスター
  var masterSheet = ss.getSheetByName(SHEET_NAME_MASTER_CLEANUP);
  if (masterSheet) {
    var deleted3 = deleteRowsByPattern(masterSheet, COL_PATIENT_ID_MASTER_CLEANUP, "TEST_");
    Logger.log("【問診マスター】 " + deleted3 + "件削除");
    totalDeleted += deleted3;
  }

  Logger.log("");
  Logger.log("合計 " + totalDeleted + "件削除完了");
}

// ヘルパー関数: TEST_で始まる行を検索
function findTestRows(sheet, pidColumnIndex) {
  var data = sheet.getDataRange().getValues();
  var testRows = [];

  for (var i = 1; i < data.length; i++) { // Skip header
    var cellValue = String(data[i][pidColumnIndex - 1] || "").trim();
    if (cellValue.indexOf("TEST_") === 0) {
      testRows.push({
        rowNumber: i + 1,
        patientId: cellValue,
        name: data[i][4] || "", // E列 = 名前（仮定）
        date: data[i][1] || "",  // B列 = 日付（予約シートの場合）
        time: data[i][2] || ""   // C列 = 時間（予約シートの場合）
      });
    }
  }

  return testRows;
}

// ヘルパー関数: パターンにマッチする行を削除
function deleteRowsByPattern(sheet, colIndex, pattern) {
  var data = sheet.getDataRange().getValues();
  var rowsToDelete = [];

  // 逆順で行番号を収集（削除時に行番号がずれないように）
  for (var i = data.length - 1; i >= 1; i--) {
    var cellValue = String(data[i][colIndex - 1] || "").trim();
    if (cellValue.indexOf(pattern) === 0) {
      rowsToDelete.push(i + 1); // 1-indexed
    }
  }

  // 逆順で削除
  for (var j = 0; j < rowsToDelete.length; j++) {
    sheet.deleteRow(rowsToDelete[j]);
  }

  return rowsToDelete.length;
}
