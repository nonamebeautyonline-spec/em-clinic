// debug-reorder-cache.js
// 再処方キャッシュの状態を確認＆強制削除

function debugReorderCache() {
  const patientId = "20251200729";
  const pid = normPid_(patientId);

  Logger.log("=== Debug Reorder Cache ===");
  Logger.log("Original patient_id: " + patientId);
  Logger.log("Normalized patient_id: " + pid);

  // キャッシュキーを確認
  const cacheKey = "reorders_" + pid;
  Logger.log("Cache key: " + cacheKey);

  // 現在のキャッシュを確認
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);

  if (cached) {
    Logger.log("\n❌ Cache EXISTS:");
    Logger.log(cached);

    // キャッシュを削除
    cache.remove(cacheKey);
    Logger.log("\n✓ Cache removed");

    // 削除を確認
    const afterRemove = cache.get(cacheKey);
    if (afterRemove) {
      Logger.log("❌ Still exists after remove!");
    } else {
      Logger.log("✓ Cache successfully deleted");
    }
  } else {
    Logger.log("\n✓ No cache found");
  }

  // シートから直接データを取得
  Logger.log("\n=== Direct Sheet Access ===");

  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty("REORDER_SHEET_ID");
  const sheetName = props.getProperty("REORDER_SHEET_NAME") || "シート1";

  Logger.log("Sheet ID: " + sheetId);
  Logger.log("Sheet Name: " + sheetName);

  if (sheetId) {
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      const sheet = ss.getSheetByName(sheetName);

      if (sheet) {
        const lastRow = sheet.getLastRow();
        Logger.log("Last row: " + lastRow);

        // 行321のデータを確認
        if (lastRow >= 321) {
          const row321 = sheet.getRange(321, 1, 1, 5).getValues()[0];
          Logger.log("\nRow 321 data:");
          Logger.log("  A (timestamp): " + row321[0]);
          Logger.log("  B (patient_id): " + row321[1]);
          Logger.log("  C (product_code): " + row321[2]);
          Logger.log("  D (status): " + row321[3]);
          Logger.log("  E (note): " + row321[4]);
        }

        // patient_id でフィルタして最新5件を取得
        Logger.log("\n=== Latest 5 reorders for patient_id=" + pid + " ===");
        const data = sheet.getDataRange().getValues();
        const matches = [];

        for (let i = data.length - 1; i >= 1; i--) { // 下から上へ
          const rowPid = normPid_(data[i][1]); // B列
          if (rowPid === pid) {
            matches.push({
              row: i + 1,
              timestamp: data[i][0],
              patient_id: data[i][1],
              product_code: data[i][2],
              status: data[i][3],
              note: data[i][4]
            });

            if (matches.length >= 5) break;
          }
        }

        matches.forEach((m, idx) => {
          Logger.log(`${idx + 1}. Row ${m.row}: status=${m.status}, product=${m.product_code}`);
        });

      }
    } catch (e) {
      Logger.log("Error: " + e);
    }
  }
}

// normPid_がない場合の定義
function normPid_(v) {
  if (v === null || v === undefined) return "";
  var s = String(v).trim();
  if (s.endsWith(".0")) s = s.slice(0, -2);
  s = s.replace(/\s+/g, "");
  return s;
}
