// 発送リストから21人分をのなめマスターに再転記（追跡番号含む）
function reCopy21FromShippingList() {
  const targetPaymentIds = [
    'bt_42', 'bt_41', 'bt_40', 'bt_39', 'bt_38', 'bt_37', 'bt_36', 'bt_35',
    'bt_34', 'bt_33', 'bt_32', 'bt_31', 'bt_30', 'bt_29', 'bt_28', 'bt_21',
    'bt_18', 'bt_14', 'bt_10', 'bt_9', 'bt_8'
  ];

  Logger.log("=== Re-copy 21 from Shipping List to のなめマスター ===");
  Logger.log("Target: " + targetPaymentIds.join(", "));

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shippingListSheet = ss.getSheetByName("発送リスト");
  const nonameMasterSheet = ss.getSheetByName("のなめマスター");

  if (!shippingListSheet) {
    Logger.log("ERROR: 発送リスト sheet not found");
    SpreadsheetApp.getUi().alert("発送リストシートが見つかりません");
    return;
  }

  if (!nonameMasterSheet) {
    Logger.log("ERROR: のなめマスター sheet not found");
    SpreadsheetApp.getUi().alert("のなめマスターシートが見つかりません");
    return;
  }

  // 発送リストの全データを取得
  const shippingLastRow = shippingListSheet.getLastRow();
  if (shippingLastRow < 2) {
    Logger.log("ERROR: No data in 発送リスト");
    return;
  }

  const shippingData = shippingListSheet.getRange(2, 1, shippingLastRow - 1, 30).getValues();

  // のなめマスターの既存データを取得（payment_id列で検索するため）
  const nonameLastRow = nonameMasterSheet.getLastRow();
  const nonameData = nonameLastRow >= 2
    ? nonameMasterSheet.getRange(2, 1, nonameLastRow - 1, 35).getValues()
    : [];

  // のなめマスターのpayment_id列（Q列 = 17列目、0-indexedで16）でマッピング
  const nonameRowMap = {};
  for (let i = 0; i < nonameData.length; i++) {
    const paymentId = String(nonameData[i][16] || "").trim(); // Q列
    if (paymentId) {
      nonameRowMap[paymentId] = i + 2; // 実際の行番号
    }
  }

  let updated = 0;
  let errors = 0;

  // 発送リストの列インデックス（要確認：実際のシート構造に合わせて調整）
  // 仮定：発送リストには payment_id, tracking_number, shipping_date などが含まれる
  // ここでは、発送リストから必要な情報を取得してのなめマスターの該当行を更新

  for (let i = 0; i < shippingData.length; i++) {
    const row = shippingData[i];
    // 発送リストのpayment_id列を特定（仮にE列 = 4とする。実際の列番号を確認してください）
    const paymentId = String(row[4] || "").trim(); // ★ 要調整

    if (!targetPaymentIds.includes(paymentId)) {
      continue;
    }

    // 発送リストから取得する情報（実際の列番号に合わせて調整）
    const trackingNumber = String(row[10] || "").trim(); // ★ 要調整
    const shippingDateRaw = row[9]; // ★ 要調整

    let shippingDate = null;
    if (shippingDateRaw) {
      try {
        if (shippingDateRaw instanceof Date) {
          shippingDate = Utilities.formatDate(shippingDateRaw, "Asia/Tokyo", "yyyy/MM/dd");
        } else {
          shippingDate = String(shippingDateRaw).trim();
        }
      } catch (e) {
        Logger.log("Failed to parse shipping_date for " + paymentId);
      }
    }

    // のなめマスターの該当行を検索
    const nonameRow = nonameRowMap[paymentId];

    if (!nonameRow) {
      Logger.log("⚠️ " + paymentId + " not found in のなめマスター");
      errors++;
      continue;
    }

    // のなめマスターの該当行を更新（U列=配送日, V列=追跡番号）
    try {
      if (shippingDate) {
        nonameMasterSheet.getRange(nonameRow, 21).setValue(shippingDate); // U列
      }
      if (trackingNumber) {
        nonameMasterSheet.getRange(nonameRow, 22).setValue(trackingNumber); // V列
      }

      updated++;
      Logger.log("✅ " + paymentId + " updated (row " + nonameRow + ")");
    } catch (e) {
      Logger.log("❌ " + paymentId + " update failed: " + e);
      errors++;
    }
  }

  const message = "転記完了\n\n成功: " + updated + "件\nエラー: " + errors + "件";
  SpreadsheetApp.getUi().alert(message);
  Logger.log("=== Re-copy Complete ===");
  Logger.log("Success: " + updated + ", Errors: " + errors);
}
