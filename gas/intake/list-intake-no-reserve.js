// list-intake-no-reserve.js
// 問診シートから、intakeId（問診送信済み）ありだが reserve_id（予約）なしの患者をリスト化

function listIntakeNoReserve() {
  const SPREADSHEET_ID = "1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo";
  const SHEET_NAME_INTAKE = "問診";

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME_INTAKE);

  if (!sheet) {
    Logger.log("❌ 問診シートが見つかりません");
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("⚠️  問診シートにデータがありません");
    return;
  }

  // 全データを取得（A〜AAまで）
  const values = sheet.getRange(2, 1, lastRow - 1, 27).getValues();

  // 列インデックス（0-based）
  const COL_TIMESTAMP = 0;      // A
  const COL_RESERVE_ID = 1;     // B
  const COL_NAME = 3;           // D
  const COL_PATIENT_ID = 25;    // Z
  const COL_INTAKE_ID = 26;     // AA

  Logger.log("=== 問診送信済み・予約なしの患者 ===\n");
  Logger.log("問診シート総件数: " + values.length);

  const results = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const intakeId = String(row[COL_INTAKE_ID] || "").trim();
    const reserveId = String(row[COL_RESERVE_ID] || "").trim();
    const patientId = String(row[COL_PATIENT_ID] || "").trim();
    const name = String(row[COL_NAME] || "").trim();
    const timestamp = row[COL_TIMESTAMP];

    // 問診送信済み（intakeIdあり）かつ予約なし（reserveIdなし）
    if (intakeId && !reserveId && patientId) {
      results.push({
        rowNumber: i + 2,
        patientId: patientId,
        name: name || "(名前なし)",
        intakeId: intakeId,
        timestamp: timestamp,
      });
    }
  }

  Logger.log("\n問診送信済み・予約なし: " + results.length + "件\n");

  if (results.length === 0) {
    Logger.log("✅ 全員予約済みです！");
    return;
  }

  // タイムスタンプの新しい順にソート
  results.sort(function(a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  Logger.log("=".repeat(80));

  results.forEach(function(r, idx) {
    const dateStr = r.timestamp instanceof Date
      ? Utilities.formatDate(r.timestamp, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss")
      : String(r.timestamp);

    Logger.log((idx + 1) + ". " + r.name);
    Logger.log("   Patient ID: " + r.patientId);
    Logger.log("   Intake ID: " + r.intakeId);
    Logger.log("   問診提出日時: " + dateStr);
    Logger.log("   シート行番号: " + r.rowNumber);
    Logger.log("");
  });

  Logger.log("=".repeat(80));
  Logger.log("\n合計: " + results.length + "件");
  Logger.log("\nこれらの患者のキャッシュをクリアして、予約を促す必要があります。");
}
