// check-sync-error.js
// syncQuestionnaireFromMaster() が実際にどのエラーを出しているか確認

function checkSyncError() {
  const SPREADSHEET_ID = "1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo";
  const SHEET_NAME_MASTER = "問診マスター";
  const SHEET_NAME_INTAKE = "問診";

  Logger.log("=== syncQuestionnaireFromMaster エラー調査 ===");

  try {
    Logger.log("Step 1: SpreadsheetApp.openById()");
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log("✓ スプレッドシート取得成功: " + ss.getName());

    Logger.log("\nStep 2: getSheetByName(SHEET_NAME_MASTER)");
    const masterSheet = ss.getSheetByName(SHEET_NAME_MASTER);
    if (!masterSheet) {
      Logger.log("❌ 「問診マスター」シートが見つかりません");
      Logger.log("利用可能なシート:");
      ss.getSheets().forEach(function(s) {
        Logger.log("  - " + s.getName());
      });
      return;
    }
    Logger.log("✓ 問診マスターシート取得成功");

    Logger.log("\nStep 3: getSheetByName(SHEET_NAME_INTAKE)");
    const qSheet = ss.getSheetByName(SHEET_NAME_INTAKE);
    if (!qSheet) {
      Logger.log("❌ 「問診」シートが見つかりません");
      return;
    }
    Logger.log("✓ 問診シート取得成功");

    Logger.log("\nStep 4: getLastRow()");
    const mLastRow = masterSheet.getLastRow();
    Logger.log("問診マスター最終行: " + mLastRow);

    if (mLastRow < 2) {
      Logger.log("⚠️  問診マスターにデータがありません（行数 < 2）");
      return;
    }

    Logger.log("\nStep 5: getRange().getValues()");
    const COL_LINE_USER_ID_MASTER = 15;
    const COL_VERIFIED_AT_MASTER = 14;
    const MASTER_COLS = Math.max(COL_LINE_USER_ID_MASTER, COL_VERIFIED_AT_MASTER);

    Logger.log("読み取り範囲: 行2〜" + mLastRow + "、列1〜" + MASTER_COLS);

    try {
      const mValues = masterSheet.getRange(2, 1, mLastRow - 1, MASTER_COLS).getValues();
      Logger.log("✓ データ取得成功: " + mValues.length + "行");
    } catch (e) {
      Logger.log("❌ データ取得失敗: " + e);
      Logger.log("エラー詳細: " + e.stack);
      return;
    }

    Logger.log("\n✅ すべてのステップが成功しました");
    Logger.log("syncQuestionnaireFromMaster()は正常に実行できるはずです");

  } catch (e) {
    Logger.log("\n❌ エラー発生: " + e);
    Logger.log("スタックトレース:");
    Logger.log(e.stack || "スタックトレースなし");
  }
}
