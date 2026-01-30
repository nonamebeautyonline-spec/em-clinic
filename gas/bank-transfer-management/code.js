// ==========================================
// 銀行振込管理システム
// ==========================================
// 機能:
// 1. 月別シート自動作成 (YYYY-MM 住所情報, YYYY-MM 入金CSV, YYYY-MM 照合済み)
// 2. Vercelからの住所情報受信
// 3. のなめマスター「銀行振込」シートへの転記
// ==========================================

// ==========================================
// スクリプトプロパティ設定 (要設定)
// ==========================================
// BANK_TRANSFER_SHEET_ID: 銀行振込管理ブックのID
// NONAME_MASTER_SHEET_ID: のなめマスターブックのID
// ADMIN_TOKEN: Vercel API認証用トークン

// ==========================================
// 定数定義
// ==========================================
const SHEET_ADDRESS_SUFFIX = " 住所情報";
const SHEET_CSV_SUFFIX = " 入金CSV";
const SHEET_VERIFIED_SUFFIX = " 照合済み";
const NONAME_BANK_TRANSFER_SHEET = "銀行振込";

// 住所情報シートのヘッダー (Supabaseから受信したデータを記録)
const ADDRESS_HEADER = [
  "受信日時",         // A: 受信日時
  "注文ID",           // B: order_id (Supabase ID)
  "患者ID",           // C: patient_id
  "商品コード",       // D: product_code
  "口座名義",         // E: account_name (カタカナ)
  "電話番号",         // F: phone_number
  "メールアドレス",   // G: email
  "郵便番号",         // H: postal_code
  "住所",             // I: address
  "ステータス",       // J: status (pending_confirmation, confirmed, shipped)
  "送信日時",         // K: submitted_at
];

// 入金CSVシートのヘッダー (銀行からダウンロードしたCSVをそのまま貼り付け)
const CSV_HEADER = [
  "取引日",
  "金額",
  "口座名義",
  "備考",
];

// 照合済みシートのヘッダー (照合完了した注文情報)
const VERIFIED_HEADER = [
  "注文日時",          // A: order_datetime (ISO形式)
  "配送先名前",        // B: name（配送先）
  "郵便番号",          // C: postal
  "住所",              // D: address
  "メールアドレス",    // E: email
  "電話番号",          // F: phone
  "商品名",            // G: items
  "金額",              // H: amount
  "請求先名前",        // I: name（請求先）※空欄
  "決済ID",            // J: payment_id (bt_123 形式)
  "商品コード",        // K: productCode
  "患者ID",            // L: patientId
  "注文ID",            // M: order_id
  "決済ステータス",    // N: payment_status (confirmed)
  "配送ステータス",    // O: shipping_status (pending)
  "追跡番号",          // P: tracking_number ※空欄
  "配送予定日",        // Q: shipping_eta ※空欄
  "メモ",              // R: notes ※空欄
  "取引日",            // S: 入金CSV の取引日
  "振込口座名義",      // T: 入金CSV の口座名義
];

// 商品情報マスター
const PRODUCT_INFO = {
  "MANJ_2_5MG_0_25": { name: "マンジャロ 2.5mg初回セット 0.25ml×4本", price: 32780 },
  "MANJ_2_5MG_0_5": { name: "マンジャロ 2.5mg継続セット 0.5ml×4本", price: 35780 },
  "MANJ_5MG": { name: "マンジャロ 5mg 0.5ml×4本", price: 52580 },
  "MANJ_7_5MG": { name: "マンジャロ 7.5mg 0.5ml×4本", price: 63580 },
  "MANJ_10MG": { name: "マンジャロ 10mg 0.5ml×4本", price: 69580 },
  "MANJ_12_5MG": { name: "マンジャロ 12.5mg 0.5ml×4本", price: 75580 },
  "MANJ_15MG": { name: "マンジャロ 15mg 0.5ml×4本", price: 81580 },
};

// ==========================================
// メイン関数: Vercelからのリクエスト処理
// ==========================================
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    Logger.log("[doPost] Received: " + JSON.stringify(body));

    var type = body.type;

    if (type === "bank_transfer_order") {
      return handleBankTransferOrder_(body);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "unknown type" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("[doPost] Error: " + err);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 銀行振込注文の処理
// ==========================================
function handleBankTransferOrder_(body) {
  var orderId = String(body.order_id || "").trim();
  var patientId = String(body.patient_id || "").trim();
  var productCode = String(body.product_code || "").trim();
  var accountName = String(body.account_name || "").trim();
  var phoneNumber = String(body.phone_number || "").trim();
  var email = String(body.email || "").trim();
  var postalCode = String(body.postal_code || "").trim();
  var address = String(body.address || "").trim();
  var submittedAt = String(body.submitted_at || "").trim();

  if (!orderId || !patientId || !productCode) {
    throw new Error("Missing required fields: order_id, patient_id, product_code");
  }

  // 現在の年月 (YYYY-MM 形式)
  var now = new Date();
  var yearMonth = Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM");

  // 銀行振込管理ブックを開く
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("BANK_TRANSFER_SHEET_ID");
  if (!sheetId) {
    throw new Error("BANK_TRANSFER_SHEET_ID not set in script properties");
  }

  var ss = SpreadsheetApp.openById(sheetId);

  // 月別「住所情報」シートを取得または作成
  var addressSheetName = yearMonth + SHEET_ADDRESS_SUFFIX;
  var addressSheet = ss.getSheetByName(addressSheetName);

  if (!addressSheet) {
    // シートが存在しない場合は作成
    addressSheet = ss.insertSheet(addressSheetName);
    addressSheet.getRange(1, 1, 1, ADDRESS_HEADER.length).setValues([ADDRESS_HEADER]);
    addressSheet.getRange(1, 1, 1, ADDRESS_HEADER.length).setFontWeight("bold").setBackground("#f3f3f3");
    addressSheet.setFrozenRows(1);

    // 入金CSVシートと照合済みシートも作成
    var csvSheetName = yearMonth + SHEET_CSV_SUFFIX;
    var csvSheet = ss.getSheetByName(csvSheetName);
    if (!csvSheet) {
      csvSheet = ss.insertSheet(csvSheetName);
      csvSheet.getRange(1, 1, 1, CSV_HEADER.length).setValues([CSV_HEADER]);
      csvSheet.getRange(1, 1, 1, CSV_HEADER.length).setFontWeight("bold").setBackground("#f3f3f3");
      csvSheet.setFrozenRows(1);
    }

    var verifiedSheetName = yearMonth + SHEET_VERIFIED_SUFFIX;
    var verifiedSheet = ss.getSheetByName(verifiedSheetName);
    if (!verifiedSheet) {
      verifiedSheet = ss.insertSheet(verifiedSheetName);
      verifiedSheet.getRange(1, 1, 1, VERIFIED_HEADER.length).setValues([VERIFIED_HEADER]);
      verifiedSheet.getRange(1, 1, 1, VERIFIED_HEADER.length).setFontWeight("bold").setBackground("#f3f3f3");
      verifiedSheet.setFrozenRows(1);
    }

    Logger.log("[handleBankTransferOrder] Created new monthly sheets for " + yearMonth);
  }

  // 住所情報シートに追記
  var receivedAt = Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
  var newRow = [
    receivedAt,       // A: 受信日時
    orderId,          // B: 注文ID
    patientId,        // C: 患者ID
    productCode,      // D: 商品コード
    accountName,      // E: 口座名義
    phoneNumber,      // F: 電話番号
    email,            // G: メールアドレス
    postalCode,       // H: 郵便番号
    address,          // I: 住所
    "confirmed",      // J: ステータス (住所入力完了 = 決済完了)
    submittedAt,      // K: 送信日時
  ];

  var lastRow = addressSheet.getLastRow();
  addressSheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);

  Logger.log("[handleBankTransferOrder] Added to " + addressSheetName + " row " + (lastRow + 1));

  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    sheet: addressSheetName,
    row: lastRow + 1,
    yearMonth: yearMonth
  })).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// メニュー関数: 選択行を照合済みシートに移動
// ==========================================
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("銀行振込管理")
    .addItem("選択行を照合済みに移動", "moveSelectedToVerified")
    .addItem("照合済みシートから\u306e\u306a\u3081マスターに転記", "copyVerifiedToNonameMaster")
    .addToUi();
}

// ==========================================
// 住所情報シート → 照合済みシートへの移動
// ==========================================
function moveSelectedToVerified() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = ss.getActiveSheet();
  var sheetName = activeSheet.getName();

  // シート名が「YYYY-MM 住所情報」形式かチェック
  if (!sheetName.endsWith(SHEET_ADDRESS_SUFFIX)) {
    SpreadsheetApp.getUi().alert("住所情報シートを開いて実行してください");
    return;
  }

  var yearMonth = sheetName.replace(SHEET_ADDRESS_SUFFIX, "");
  var verifiedSheetName = yearMonth + SHEET_VERIFIED_SUFFIX;
  var verifiedSheet = ss.getSheetByName(verifiedSheetName);

  if (!verifiedSheet) {
    SpreadsheetApp.getUi().alert("照合済みシート「" + verifiedSheetName + "」が見つかりません");
    return;
  }

  var selection = activeSheet.getSelection();
  var ranges = selection.getActiveRangeList().getRanges();

  if (ranges.length === 0) {
    SpreadsheetApp.getUi().alert("行を選択してください");
    return;
  }

  var rowsToMove = [];
  for (var i = 0; i < ranges.length; i++) {
    var range = ranges[i];
    var startRow = range.getRow();
    var numRows = range.getNumRows();

    for (var j = 0; j < numRows; j++) {
      var row = startRow + j;
      if (row > 1) { // ヘッダー行を除外
        rowsToMove.push(row);
      }
    }
  }

  // 重複削除 & ソート (降順で削除するため)
  rowsToMove = rowsToMove.filter(function(v, i, a) { return a.indexOf(v) === i; });
  rowsToMove.sort(function(a, b) { return b - a; });

  if (rowsToMove.length === 0) {
    SpreadsheetApp.getUi().alert("有効な行が選択されていません");
    return;
  }

  // 照合済みシートに転記
  for (var i = 0; i < rowsToMove.length; i++) {
    var rowNum = rowsToMove[i];
    var rowData = activeSheet.getRange(rowNum, 1, 1, ADDRESS_HEADER.length).getValues()[0];

    // 住所情報シートのデータを照合済み形式に変換
    var orderId = rowData[1];          // B: 注文ID
    var patientId = rowData[2];        // C: 患者ID
    var productCode = rowData[3];      // D: 商品コード
    var accountName = rowData[4];      // E: 口座名義
    var phoneNumber = rowData[5];      // F: 電話番号
    var email = rowData[6];            // G: メールアドレス
    var postalCode = rowData[7];       // H: 郵便番号
    var address = rowData[8];          // I: 住所
    var submittedAt = rowData[10];     // K: 送信日時

    var productInfo = PRODUCT_INFO[productCode] || { name: "マンジャロ", price: 0 };
    var paymentId = "bt_" + orderId;

    // 注文日時 (ISO形式)
    var orderDatetime = submittedAt;
    if (typeof orderDatetime === "string" && !orderDatetime.includes("T")) {
      // YYYY-MM-DD HH:mm:ss → ISO形式に変換
      orderDatetime = orderDatetime.replace(" ", "T") + "+09:00";
    }

    var verifiedRow = [
      orderDatetime,       // A: 注文日時
      accountName,         // B: 配送先名前
      postalCode,          // C: 郵便番号
      address,             // D: 住所
      email,               // E: メールアドレス
      phoneNumber,         // F: 電話番号
      productInfo.name,    // G: 商品名
      productInfo.price,   // H: 金額
      "",                  // I: 請求先名前 (空欄)
      paymentId,           // J: 決済ID
      productCode,         // K: 商品コード
      patientId,           // L: 患者ID
      orderId,             // M: 注文ID
      "confirmed",         // N: 決済ステータス
      "pending",           // O: 配送ステータス
      "",                  // P: 追跡番号 (空欄)
      "",                  // Q: 配送予定日 (空欄)
      "",                  // R: メモ (空欄)
      "",                  // S: 取引日 (手動入力)
      "",                  // T: 振込口座名義 (手動入力)
    ];

    var lastRow = verifiedSheet.getLastRow();
    verifiedSheet.getRange(lastRow + 1, 1, 1, verifiedRow.length).setValues([verifiedRow]);
  }

  // 元の行を削除 (降順で削除)
  for (var i = 0; i < rowsToMove.length; i++) {
    activeSheet.deleteRow(rowsToMove[i]);
  }

  SpreadsheetApp.getUi().alert(rowsToMove.length + "件を照合済みシートに移動しました");
  Logger.log("[moveSelectedToVerified] Moved " + rowsToMove.length + " rows to " + verifiedSheetName);
}

// ==========================================
// 照合済みシート → のなめマスター「銀行振込」シートへの転記
// ==========================================
function copyVerifiedToNonameMaster() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = ss.getActiveSheet();
  var sheetName = activeSheet.getName();

  // シート名が「YYYY-MM 照合済み」形式かチェック
  if (!sheetName.endsWith(SHEET_VERIFIED_SUFFIX)) {
    SpreadsheetApp.getUi().alert("照合済みシートを開いて実行してください");
    return;
  }

  var selection = activeSheet.getSelection();
  var ranges = selection.getActiveRangeList().getRanges();

  if (ranges.length === 0) {
    SpreadsheetApp.getUi().alert("行を選択してください");
    return;
  }

  var rowsToCopy = [];
  for (var i = 0; i < ranges.length; i++) {
    var range = ranges[i];
    var startRow = range.getRow();
    var numRows = range.getNumRows();

    for (var j = 0; j < numRows; j++) {
      var row = startRow + j;
      if (row > 1) { // ヘッダー行を除外
        rowsToCopy.push(row);
      }
    }
  }

  // 重複削除 & ソート
  rowsToCopy = rowsToCopy.filter(function(v, i, a) { return a.indexOf(v) === i; });
  rowsToCopy.sort(function(a, b) { return a - b; });

  if (rowsToCopy.length === 0) {
    SpreadsheetApp.getUi().alert("有効な行が選択されていません");
    return;
  }

  // のなめマスターを開く
  var props = PropertiesService.getScriptProperties();
  var nonameMasterId = props.getProperty("NONAME_MASTER_SHEET_ID");
  if (!nonameMasterId) {
    SpreadsheetApp.getUi().alert("NONAME_MASTER_SHEET_IDが設定されていません");
    return;
  }

  var nonameMasterSs = SpreadsheetApp.openById(nonameMasterId);
  var bankTransferSheet = nonameMasterSs.getSheetByName(NONAME_BANK_TRANSFER_SHEET);

  if (!bankTransferSheet) {
    SpreadsheetApp.getUi().alert("のなめマスターに「銀行振込」シートが見つかりません");
    return;
  }

  // 照合済みシートのデータをそのまま転記
  var copiedCount = 0;
  for (var i = 0; i < rowsToCopy.length; i++) {
    var rowNum = rowsToCopy[i];
    var rowData = activeSheet.getRange(rowNum, 1, 1, VERIFIED_HEADER.length).getValues()[0];

    var lastRow = bankTransferSheet.getLastRow();
    bankTransferSheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
    copiedCount++;
  }

  SpreadsheetApp.getUi().alert(copiedCount + "件を\u306e\u306a\u3081マスター「銀行振込」シートに転記しました");
  Logger.log("[copyVerifiedToNonameMaster] Copied " + copiedCount + " rows to Noname Master");
}

// ==========================================
// テスト関数
// ==========================================
function testHandleBankTransferOrder() {
  var testBody = {
    type: "bank_transfer_order",
    order_id: "123",
    patient_id: "20251200001",
    product_code: "MANJ_2_5MG_0_25",
    account_name: "ヤマダタロウ",
    phone_number: "09012345678",
    email: "test@example.com",
    postal_code: "123-4567",
    address: "東京都渋谷区1-2-3",
    submitted_at: "2026-01-29T19:00:00+09:00"
  };

  var result = handleBankTransferOrder_(testBody);
  Logger.log("Test result: " + result.getContent());
}
