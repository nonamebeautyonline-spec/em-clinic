// check-name-missing.js
// Supabaseで「名前なし」の患者をシートで確認

function checkNameMissing() {
  const SPREADSHEET_ID = "1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo";
  const SHEET_NAME_INTAKE = "問診";

  const targetPatients = [
    "20260101541",
    "20260101534"
  ];

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

  // 全データを取得
  const values = sheet.getRange(2, 1, lastRow - 1, 27).getValues();

  // 列インデックス（0-based）
  const COL_TIMESTAMP = 0;      // A
  const COL_RESERVE_ID = 1;     // B
  const COL_SUBMITTED_AT = 2;   // C
  const COL_NAME = 3;           // D
  const COL_SEX = 4;            // E
  const COL_BIRTH = 5;          // F
  const COL_LINE_ID = 6;        // G
  const COL_NAME_KANA = 22;     // W
  const COL_TEL = 23;           // X
  const COL_ANSWERER_ID = 24;   // Y
  const COL_PATIENT_ID = 25;    // Z
  const COL_INTAKE_ID = 26;     // AA

  Logger.log("=== 「名前なし」患者のシート状態 ===\n");

  targetPatients.forEach(function(targetPid) {
    Logger.log("Patient ID: " + targetPid);

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const pid = String(row[COL_PATIENT_ID] || "").trim();

      if (pid === targetPid) {
        Logger.log("\n✓ シート行番号: " + (i + 2));
        Logger.log("  A (timestamp): " + row[COL_TIMESTAMP]);
        Logger.log("  B (reserve_id): " + row[COL_RESERVE_ID]);
        Logger.log("  C (submitted_at): " + row[COL_SUBMITTED_AT]);
        Logger.log("  D (name): " + row[COL_NAME]);
        Logger.log("  E (sex): " + row[COL_SEX]);
        Logger.log("  F (birth): " + row[COL_BIRTH]);
        Logger.log("  G (line_id): " + row[COL_LINE_ID]);
        Logger.log("  W (name_kana): " + row[COL_NAME_KANA]);
        Logger.log("  X (tel): " + row[COL_TEL]);
        Logger.log("  Y (answerer_id): " + row[COL_ANSWERER_ID]);
        Logger.log("  Z (patient_id): " + row[COL_PATIENT_ID]);
        Logger.log("  AA (intake_id): " + row[COL_INTAKE_ID]);

        // Supabaseに同期すべきか確認
        const hasIntakeId = String(row[COL_INTAKE_ID] || "").trim();
        const hasName = String(row[COL_NAME] || "").trim();

        if (hasIntakeId && hasName) {
          Logger.log("\n→ シートには名前あり（" + hasName + "）");
          Logger.log("  Supabaseに同期されていない可能性");
        } else if (hasIntakeId && !hasName) {
          Logger.log("\n⚠️  シートにも名前なし（データ不整合）");
        }

        break;
      }
    }

    Logger.log("\n" + "=".repeat(80) + "\n");
  });
}
