// のなめマスター「銀行振込」シートからordersテーブルに全件保存
function backfillOrdersFromNonameMaster() {
  var props = PropertiesService.getScriptProperties();
  var nonameMasterId = props.getProperty("NONAME_MASTER_SHEET_ID");
  
  if (!nonameMasterId) {
    SpreadsheetApp.getUi().alert("NONAME_MASTER_SHEET_IDが設定されていません");
    return;
  }

  var nonameMasterSs = SpreadsheetApp.openById(nonameMasterId);
  var bankTransferSheet = nonameMasterSs.getSheetByName("銀行振込");

  if (!bankTransferSheet) {
    SpreadsheetApp.getUi().alert("のなめマスターに「銀行振込」シートが見つかりません");
    return;
  }

  var lastRow = bankTransferSheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert("データがありません");
    return;
  }

  // ヘッダー: A=注文日時, B=配送先名前, C=郵便番号, D=住所, E=メール, F=電話, 
  //          G=商品名, H=金額, I=請求先名前, J=決済ID, K=商品コード, L=患者ID, 
  //          M=注文ID, N=決済ステータス
  // 追跡情報は別の列にあるはず（のなめマスターの構造を確認）
  
  var allData = bankTransferSheet.getRange(2, 1, lastRow - 1, 20).getValues(); // 20列まで取得
  
  var insertedCount = 0;
  var errorCount = 0;

  for (var i = 0; i < allData.length; i++) {
    var row = allData[i];
    
    var orderDatetime = row[0];  // A
    var shipName = row[1];        // B
    var postalCode = row[2];      // C
    var address = row[3];         // D
    var email = row[4];           // E
    var phone = row[5];           // F
    var productName = row[6];     // G
    var amount = row[7];          // H
    var billingName = row[8];     // I
    var paymentId = row[9];       // J (bt_123)
    var productCode = row[10];    // K
    var patientId = row[11];      // L
    var orderId = row[12];        // M
    var paymentStatus = row[13];  // N
    
    // 追跡情報（列を確認する必要あり）
    var shippingStatus = row[14] || "pending";  // O列？
    var shippingDate = row[15] || null;         // P列？
    var trackingNumber = row[16] || null;       // Q列？
    
    if (!paymentId || !patientId) {
      Logger.log("Skipping row " + (i+2) + ": missing payment_id or patient_id");
      continue;
    }

    var paidAtIso = "";
    try {
      if (orderDatetime instanceof Date) {
        paidAtIso = orderDatetime.toISOString();
      } else if (typeof orderDatetime === "string") {
        paidAtIso = new Date(orderDatetime).toISOString();
      }
    } catch (e) {
      Logger.log("Date conversion error for row " + (i+2) + ": " + e);
      paidAtIso = new Date().toISOString();
    }

    var orderData = {
      id: String(paymentId).trim(),
      patient_id: String(patientId).trim(),
      product_code: productCode || null,
      product_name: productName || null,
      amount: Number(amount) || 0,
      paid_at: paidAtIso,
      payment_method: "bank_transfer",
      shipping_status: shippingStatus || "pending",
      payment_status: paymentStatus || "COMPLETED",
      shipping_date: shippingDate || null,
      tracking_number: trackingNumber || null,
    };

    var inserted = insertOrderToSupabase_(orderData);
    if (inserted) {
      insertedCount++;
      Logger.log("✅ Row " + (i+2) + ": " + paymentId);
    } else {
      errorCount++;
      Logger.log("❌ Row " + (i+2) + ": " + paymentId);
    }
  }

  var message = "バックフィル完了\n\n";
  message += "成功: " + insertedCount + "件\n";
  message += "失敗: " + errorCount + "件";

  SpreadsheetApp.getUi().alert(message);
  Logger.log("[backfillOrdersFromNonameMaster] Success: " + insertedCount + ", Errors: " + errorCount);
}
