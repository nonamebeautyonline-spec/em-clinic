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
  "モード",           // E: mode (first, current, reorder)
  "再購入ID",         // F: reorder_id
  "口座名義",         // G: account_name (カタカナ)
  "電話番号",         // H: phone_number
  "メールアドレス",   // I: email
  "郵便番号",         // J: postal_code
  "住所",             // K: address
  "配送先氏名",       // L: shipping_name (漢字)
  "ステータス",       // M: status (pending_confirmation, confirmed, shipped)
  "送信日時",         // N: submitted_at
];

// 入金CSVシートのヘッダー (銀行からダウンロードしたCSVをそのまま貼り付け)
const CSV_HEADER = [
  "日付",
  "内容",
  "出金金額(円)",
  "入金金額(円)",
  "残高(円)",
  "メモ",
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
  // 新しい商品コード形式
  "MJL_2.5mg_1m": { name: "マンジャロ 2.5mg 1ヶ月", price: 13000 },
  "MJL_2.5mg_2m": { name: "マンジャロ 2.5mg 2ヶ月", price: 25500 },
  "MJL_2.5mg_3m": { name: "マンジャロ 2.5mg 3ヶ月", price: 35000 },
  "MJL_5mg_1m": { name: "マンジャロ 5mg 1ヶ月", price: 22850 },
  "MJL_5mg_2m": { name: "マンジャロ 5mg 2ヶ月", price: 45500 },
  "MJL_5mg_3m": { name: "マンジャロ 5mg 3ヶ月", price: 63000 },
  "MJL_7.5mg_1m": { name: "マンジャロ 7.5mg 1ヶ月", price: 34000 },
  "MJL_7.5mg_2m": { name: "マンジャロ 7.5mg 2ヶ月", price: 65000 },
  "MJL_7.5mg_3m": { name: "マンジャロ 7.5mg 3ヶ月", price: 96000 },
  // 旧形式（後方互換性のため）
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

    if (type === "check_sheet") {
      return handleCheckSheet_(body);
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
// シート内容確認（デバッグ用）
// ==========================================
function handleCheckSheet_(body) {
  try {
    var patientIds = body.patient_ids || [];
    var yearMonth = body.year_month || "2026-01"; // デフォルト

    Logger.log("[handleCheckSheet] patient_ids: " + JSON.stringify(patientIds));
    Logger.log("[handleCheckSheet] year_month: " + yearMonth);

    var props = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty("BANK_TRANSFER_SHEET_ID");

    if (!sheetId) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: "BANK_TRANSFER_SHEET_ID not set"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheetName = yearMonth + SHEET_ADDRESS_SUFFIX;
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: "Sheet not found: " + sheetName
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        sheet: sheetName,
        found: [],
        total_rows: 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
    var found = [];

    data.forEach(function(row, index) {
      var pid = String(row[2] || "").trim(); // C列: 患者ID

      // 指定された患者IDリストに含まれているか
      if (patientIds.length === 0 || patientIds.indexOf(pid) >= 0) {
        found.push({
          row: index + 2,
          received_at: row[0],
          order_id: row[1],
          patient_id: pid,
          product_code: row[3],
          account_name: row[6],
          address: row[10],
          status: row[11]
        });
      }
    });

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      sheet: sheetName,
      total_rows: data.length,
      found: found,
      found_count: found.length
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("[handleCheckSheet] Error: " + err);
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: String(err),
      errorStack: String(err.stack || "")
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 銀行振込注文の処理
// ==========================================
function handleBankTransferOrder_(body) {
  try {
    Logger.log("[handleBankTransferOrder] START");

    var orderId = String(body.order_id || "").trim();
    var patientId = String(body.patient_id || "").trim();
    var productCode = String(body.product_code || "").trim();
    var mode = String(body.mode || "first").trim();  // ★ 追加
    var reorderId = String(body.reorder_id || "").trim();  // ★ 追加
    var accountName = String(body.account_name || "").trim();
    var shippingName = String(body.shipping_name || "").trim();  // ★ 追加: 配送先氏名
    var phoneNumber = String(body.phone_number || "").trim();
    var email = String(body.email || "").trim();
    var postalCode = String(body.postal_code || "").trim();
    var address = String(body.address || "").trim();
    var submittedAt = String(body.submitted_at || "").trim();

    Logger.log("[handleBankTransferOrder] Parsed fields - orderId: " + orderId + ", patientId: " + patientId + ", productCode: " + productCode);

    if (!orderId || !patientId || !productCode) {
      var error = "Missing required fields: order_id=" + orderId + ", patient_id=" + patientId + ", product_code=" + productCode;
      Logger.log("[handleBankTransferOrder] ERROR: " + error);
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error, step: "validation" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 現在の年月 (YYYY-MM 形式)
    var now = new Date();
    var yearMonth = Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM");
    Logger.log("[handleBankTransferOrder] YearMonth: " + yearMonth);

    // 銀行振込管理ブックを開く
    var props = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty("BANK_TRANSFER_SHEET_ID");
    Logger.log("[handleBankTransferOrder] BANK_TRANSFER_SHEET_ID: " + (sheetId ? "SET" : "NOT SET"));

    if (!sheetId) {
      var error = "BANK_TRANSFER_SHEET_ID not set in script properties";
      Logger.log("[handleBankTransferOrder] ERROR: " + error);
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error, step: "config" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    Logger.log("[handleBankTransferOrder] Opening spreadsheet: " + sheetId);
    var ss = SpreadsheetApp.openById(sheetId);
    Logger.log("[handleBankTransferOrder] Spreadsheet opened successfully");

    // 月別「住所情報」シートを取得または作成
    var addressSheetName = yearMonth + SHEET_ADDRESS_SUFFIX;
    Logger.log("[handleBankTransferOrder] Looking for sheet: " + addressSheetName);
    var addressSheet = ss.getSheetByName(addressSheetName);

    if (!addressSheet) {
      Logger.log("[handleBankTransferOrder] Sheet not found, creating new monthly sheets...");
      // シートが存在しない場合は作成
      addressSheet = ss.insertSheet(addressSheetName);
      addressSheet.getRange(1, 1, 1, ADDRESS_HEADER.length).setValues([ADDRESS_HEADER]);
      addressSheet.getRange(1, 1, 1, ADDRESS_HEADER.length).setFontWeight("bold").setBackground("#f3f3f3");
      addressSheet.setFrozenRows(1);
      Logger.log("[handleBankTransferOrder] Created address sheet: " + addressSheetName);

      // 入金CSVシートと照合済みシートも作成
      var csvSheetName = yearMonth + SHEET_CSV_SUFFIX;
      var csvSheet = ss.getSheetByName(csvSheetName);
      if (!csvSheet) {
        csvSheet = ss.insertSheet(csvSheetName);
        csvSheet.getRange(1, 1, 1, CSV_HEADER.length).setValues([CSV_HEADER]);
        csvSheet.getRange(1, 1, 1, CSV_HEADER.length).setFontWeight("bold").setBackground("#f3f3f3");
        csvSheet.setFrozenRows(1);
        Logger.log("[handleBankTransferOrder] Created CSV sheet: " + csvSheetName);
      }

      var verifiedSheetName = yearMonth + SHEET_VERIFIED_SUFFIX;
      var verifiedSheet = ss.getSheetByName(verifiedSheetName);
      if (!verifiedSheet) {
        verifiedSheet = ss.insertSheet(verifiedSheetName);
        verifiedSheet.getRange(1, 1, 1, VERIFIED_HEADER.length).setValues([VERIFIED_HEADER]);
        verifiedSheet.getRange(1, 1, 1, VERIFIED_HEADER.length).setFontWeight("bold").setBackground("#f3f3f3");
        verifiedSheet.setFrozenRows(1);
        Logger.log("[handleBankTransferOrder] Created verified sheet: " + verifiedSheetName);
      }

      Logger.log("[handleBankTransferOrder] ✅ Created new monthly sheets for " + yearMonth);
    } else {
      Logger.log("[handleBankTransferOrder] Sheet found: " + addressSheetName);
    }

    // 住所情報シートに追記
    Logger.log("[handleBankTransferOrder] Preparing data for insertion");
    var receivedAt = Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
    var newRow = [
      receivedAt,       // A: 受信日時
      orderId,          // B: 注文ID
      patientId,        // C: 患者ID
      productCode,      // D: 商品コード
      mode,             // E: モード (first, current, reorder)
      reorderId,        // F: 再購入ID
      accountName,      // G: 口座名義
      phoneNumber,      // H: 電話番号
      email,            // I: メールアドレス
      postalCode,       // J: 郵便番号
      address,          // K: 住所
      shippingName,     // L: 配送先氏名 (漢字)
      "confirmed",      // M: ステータス (住所入力完了 = 決済完了)
      submittedAt,      // N: 送信日時
    ];

    Logger.log("[handleBankTransferOrder] Inserting data to sheet: " + addressSheetName);
    var lastRow = addressSheet.getLastRow();
    Logger.log("[handleBankTransferOrder] Current last row: " + lastRow + ", inserting at row: " + (lastRow + 1));

    addressSheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);

    Logger.log("[handleBankTransferOrder] ✅ SUCCESS - Added to " + addressSheetName + " row " + (lastRow + 1));

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      sheet: addressSheetName,
      row: lastRow + 1,
      yearMonth: yearMonth,
      orderId: orderId,
      patientId: patientId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("[handleBankTransferOrder] ❌ ERROR: " + err);
    Logger.log("[handleBankTransferOrder] Error stack: " + err.stack);
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: String(err),
      errorStack: String(err.stack || ""),
      step: "unknown"
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// メニュー関数
// ==========================================
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("銀行振込管理")
    .addItem("自動照合（住所情報 × 入金CSV）", "reconcileBankTransfers")
    .addSeparator()
    .addItem("選択行を照合済みにコピー", "copySelectedToVerified")
    .addItem("選択行をのなめマスターに転記", "copyVerifiedToNonameMaster")
    .addToUi();
}

// ==========================================
// 住所情報シート → 照合済みシートへのコピー
// ==========================================
function copySelectedToVerified() {
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
    var mode = rowData[4];             // E: モード
    var reorderId = rowData[5];        // F: 再購入ID
    var accountName = rowData[6];      // G: 口座名義
    var phoneNumber = rowData[7];      // H: 電話番号
    var email = rowData[8];            // I: メールアドレス
    var postalCode = rowData[9];       // J: 郵便番号
    var address = rowData[10];         // K: 住所
    var shippingName = rowData[11];    // L: 配送先氏名 (漢字)
    var submittedAt = rowData[13];     // N: 送信日時

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
      shippingName || accountName, // B: 配送先名前 (shipping_nameがあればそれを使用、なければaccountName)
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

  SpreadsheetApp.getUi().alert(rowsToMove.length + "件を照合済みシートにコピーしました");
  Logger.log("[copySelectedToVerified] Copied " + rowsToMove.length + " rows to " + verifiedSheetName);
}

// ==========================================
// patient_idから氏名を取得（Supabase intakeテーブルから）
// ==========================================
function getPatientNameFromSupabase_(patientId) {
  if (!patientId) return "";

  try {
    var props = PropertiesService.getScriptProperties();
    var supabaseUrl = props.getProperty("SUPABASE_URL");
    var supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      Logger.log("[getPatientNameFromSupabase] SUPABASE_URL or SUPABASE_ANON_KEY not set");
      return "";
    }

    // patient_idを正規化（.0を削除、空白を削除）
    var normalizedPid = String(patientId).trim().replace(/\.0$/, "").replace(/\s+/g, "");

    // intakeテーブルから氏名を取得（patient_nameが氏名）
    var url = supabaseUrl + "/rest/v1/intake?select=patient_name&patient_id=eq." + encodeURIComponent(normalizedPid) + "&limit=1";

    var response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code !== 200) {
      Logger.log("[getPatientNameFromSupabase] HTTP " + code + " for patient_id: " + patientId);
      return "";
    }

    var data = JSON.parse(response.getContentText());
    Logger.log("[getPatientNameFromSupabase] Response data for " + normalizedPid + ": " + JSON.stringify(data));

    if (data && data.length > 0 && data[0].patient_name) {
      var name = String(data[0].patient_name).trim();
      Logger.log("[getPatientNameFromSupabase] Found: " + normalizedPid + " = " + name);
      return name;
    }

    Logger.log("[getPatientNameFromSupabase] Not found for patient_id: " + normalizedPid + " (original: " + patientId + ")");
    return "";
  } catch (e) {
    Logger.log("[getPatientNameFromSupabase] Error for patient_id " + patientId + ": " + e);
    return "";
  }
}

// ==========================================
// のなめマスター「銀行振込」シートからordersテーブルに全件バックフィル
// ==========================================
function backfillOrdersFromNonameMaster() {
  var props = PropertiesService.getScriptProperties();
  var nonameMasterId = props.getProperty("NONAME_MASTER_SHEET_ID");

  if (!nonameMasterId) {
    SpreadsheetApp.getUi().alert("NONAME_MASTER_SHEET_IDが設定されていません");
    return;
  }

  var nonameMasterSs = SpreadsheetApp.openById(nonameMasterId);
  var bankTransferSheet = nonameMasterSs.getSheetByName(NONAME_BANK_TRANSFER_SHEET);

  if (!bankTransferSheet) {
    SpreadsheetApp.getUi().alert("のなめマスターに「" + NONAME_BANK_TRANSFER_SHEET + "」シートが見つかりません");
    return;
  }

  var lastRow = bankTransferSheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert("データがありません");
    return;
  }

  // Square webhookと同じヘッダー構造
  // A=注文日時, B=配送先名前, C=郵便番号, D=住所, E=メール, F=電話,
  // G=商品名, H=金額, I=請求先名前, J=決済ID, K=商品コード, L=患者ID,
  // M=注文ID, N=決済ステータス

  var allData = bankTransferSheet.getRange(2, 1, lastRow - 1, 14).getValues();

  var insertedCount = 0;
  var errorCount = 0;

  for (var i = 0; i < allData.length; i++) {
    var row = allData[i];

    var orderDatetime = row[0];    // A
    var productName = row[6];      // G
    var amount = row[7];           // H
    var paymentId = String(row[9] || "").trim(); // J (bt_123)
    var productCode = row[10];     // K
    var patientId = String(row[11] || "").trim(); // L
    var paymentStatus = row[13];   // N

    if (!paymentId || !patientId) {
      Logger.log("[backfill] Skipping row " + (i+2) + ": missing payment_id or patient_id");
      continue;
    }

    var paidAtIso = "";
    try {
      if (orderDatetime instanceof Date) {
        paidAtIso = orderDatetime.toISOString();
      } else if (typeof orderDatetime === "string") {
        // yyyy/MM/dd形式をパース
        var match = String(orderDatetime).match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
        if (match) {
          paidAtIso = new Date(match[1] + "-" + match[2] + "-" + match[3] + "T00:00:00+09:00").toISOString();
        } else {
          paidAtIso = new Date(orderDatetime).toISOString();
        }
      }
    } catch (e) {
      Logger.log("[backfill] Date conversion error for row " + (i+2) + ": " + e);
      paidAtIso = new Date().toISOString();
    }

    var orderData = {
      id: paymentId,
      patient_id: patientId,
      product_code: productCode || null,
      product_name: productName || null,
      amount: Number(amount) || 0,
      paid_at: paidAtIso,
      payment_method: "bank_transfer",
      shipping_status: "pending",
      payment_status: paymentStatus || "COMPLETED",
    };

    var inserted = insertOrderToSupabase_(orderData);
    if (inserted) {
      insertedCount++;
      if ((i + 1) % 10 === 0) {
        Logger.log("[backfill] Progress: " + (i + 1) + "/" + allData.length);
      }
    } else {
      errorCount++;
      Logger.log("[backfill] ❌ Row " + (i+2) + ": " + paymentId);
    }
  }

  var message = "バックフィル完了\n\n";
  message += "成功: " + insertedCount + "件\n";
  message += "失敗: " + errorCount + "件";

  SpreadsheetApp.getUi().alert(message);
  Logger.log("[backfillOrdersFromNonameMaster] Success: " + insertedCount + ", Errors: " + errorCount);
}

// ==========================================
// Supabase ordersテーブルにデータを保存
// ==========================================
function insertOrderToSupabase_(orderData) {
  try {
    var props = PropertiesService.getScriptProperties();
    var supabaseUrl = props.getProperty("SUPABASE_URL");
    var supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      Logger.log("[insertOrderToSupabase] SUPABASE_URL or SUPABASE_ANON_KEY not set");
      return false;
    }

    var url = supabaseUrl + "/rest/v1/orders";

    var response = UrlFetchApp.fetch(url, {
      method: "post",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      payload: JSON.stringify(orderData),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code === 201 || code === 200) {
      Logger.log("[insertOrderToSupabase] SUCCESS for order_id: " + orderData.id);
      return true;
    } else {
      Logger.log("[insertOrderToSupabase] HTTP " + code + " for order_id: " + orderData.id);
      Logger.log("[insertOrderToSupabase] Response: " + response.getContentText());
      return false;
    }
  } catch (e) {
    Logger.log("[insertOrderToSupabase] Error for order_id " + orderData.id + ": " + e);
    return false;
  }
}

// ==========================================
// Vercel キャッシュ無効化API呼び出し
// ==========================================
function invalidateVercelCache_(patientId) {
  if (!patientId) return;

  var props = PropertiesService.getScriptProperties();
  var vercelUrl = props.getProperty("VERCEL_URL");
  var adminToken = props.getProperty("ADMIN_TOKEN");

  if (!vercelUrl || !adminToken) {
    Logger.log("[invalidateCache] Missing VERCEL_URL or ADMIN_TOKEN");
    return;
  }

  var url = vercelUrl + "/api/admin/invalidate-cache";

  try {
    var res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + adminToken },
      payload: JSON.stringify({ patient_id: patientId }),
      muteHttpExceptions: true,
    });

    var code = res.getResponseCode();
    var body = res.getContentText();

    if (code >= 200 && code < 300) {
      Logger.log("[invalidateCache] ✅ Success for patient_id=" + patientId);
    } else {
      Logger.log("[invalidateCache] ❌ Failed for patient_id=" + patientId + " code=" + code);
    }
  } catch (e) {
    Logger.log("[invalidateCache] Error for patient_id=" + patientId + ": " + e);
  }
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

  // 照合済みシートのデータを転記（氏名をSupabaseから取得 & ordersテーブルに保存）
  var copiedCount = 0;
  var notFoundCount = 0;
  var ordersInsertedCount = 0;
  var ordersErrorCount = 0;

  for (var i = 0; i < rowsToCopy.length; i++) {
    var rowNum = rowsToCopy[i];
    var rowData = activeSheet.getRange(rowNum, 1, 1, VERIFIED_HEADER.length).getValues()[0];

    // B列（配送先名前、インデックス1）に既に氏名（漢字）が入っている場合はそのまま使う
    // 入っていない場合（古いデータ）はpatient_idからSupabaseで取得
    var patientId = String(rowData[11] || "").trim();
    var shippingName = String(rowData[1] || "").trim();

    // shipping_nameがカタカナのみの場合、Supabaseから漢字の氏名を取得
    var isKatakana = /^[ァ-ヶー\s]+$/.test(shippingName);
    if (!shippingName || isKatakana) {
      var kanjiName = getPatientNameFromSupabase_(patientId);
      if (kanjiName) {
        rowData[1] = kanjiName;
        Logger.log("[copyVerifiedToNonameMaster] " + patientId + ": Supabaseから取得 - " + kanjiName);
      } else {
        notFoundCount++;
        Logger.log("[copyVerifiedToNonameMaster] ⚠️  氏名が見つかりません: " + patientId + " (カタカナのまま転記)");
      }
    } else {
      // 既に漢字の氏名がある場合
      Logger.log("[copyVerifiedToNonameMaster] " + patientId + ": 既存の氏名を使用 - " + shippingName);
    }

    // ★ A列（注文日時）をyyyy/MM/dd形式に変換
    var orderDatetime = rowData[0];
    if (orderDatetime) {
      try {
        var date = new Date(orderDatetime);
        rowData[0] = Utilities.formatDate(date, "Asia/Tokyo", "yyyy/MM/dd");
      } catch (e) {
        Logger.log("[copyVerifiedToNonameMaster] 日付変換エラー: " + e);
      }
    }

    // ★ Supabase ordersテーブルに保存（銀行振込データ）
    var paymentId = String(rowData[9] || "").trim(); // J列: 決済ID (bt_123など)
    var productCode = String(rowData[10] || "").trim(); // K列: 商品コード
    var productName = String(rowData[6] || "").trim(); // G列: 商品名
    var amount = rowData[7] || 0; // H列: 金額
    var paidAtRaw = rowData[0]; // A列: 注文日時（既にDate型またはISO形式文字列）

    if (paymentId && patientId) {
      var paidAtIso = "";
      try {
        if (paidAtRaw instanceof Date) {
          paidAtIso = paidAtRaw.toISOString();
        } else if (typeof paidAtRaw === "string") {
          paidAtIso = new Date(paidAtRaw).toISOString();
        }
      } catch (e) {
        Logger.log("[copyVerifiedToNonameMaster] paid_at変換エラー: " + e);
        paidAtIso = new Date().toISOString(); // フォールバック
      }

      var orderData = {
        id: paymentId,
        patient_id: patientId,
        product_code: productCode || null,
        product_name: productName || null,
        amount: Number(amount) || 0,
        paid_at: paidAtIso,
        payment_method: "bank_transfer",
        shipping_status: "pending",
        payment_status: "COMPLETED",
      };

      var inserted = insertOrderToSupabase_(orderData);
      if (inserted) {
        ordersInsertedCount++;
        Logger.log("[copyVerifiedToNonameMaster] ✅ ordersテーブルに保存: " + paymentId);

        // ★ キャッシュ無効化（銀行振込の決済完了でbank_*→bt_*に切り替え）
        invalidateVercelCache_(patientId);
      } else {
        ordersErrorCount++;
        Logger.log("[copyVerifiedToNonameMaster] ❌ ordersテーブル保存エラー: " + paymentId);
      }
    }

    var lastRow = bankTransferSheet.getLastRow();
    bankTransferSheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
    copiedCount++;
  }

  var message = copiedCount + "件を\u306e\u306a\u3081マスター「銀行振込」シートに転記しました";
  if (notFoundCount > 0) {
    message += "\n\n⚠️ " + notFoundCount + "件の患者IDで氏名が見つかりませんでした（カタカナのまま転記）";
  }
  if (ordersInsertedCount > 0) {
    message += "\n\n✅ " + ordersInsertedCount + "件をordersテーブルに保存しました";
  }
  if (ordersErrorCount > 0) {
    message += "\n\n❌ " + ordersErrorCount + "件のordersテーブル保存でエラーが発生しました";
  }

  SpreadsheetApp.getUi().alert(message);
  Logger.log("[copyVerifiedToNonameMaster] Copied: " + copiedCount + " rows, Not found: " + notFoundCount + ", Orders inserted: " + ordersInsertedCount + ", Orders errors: " + ordersErrorCount);
}

// ==========================================
// シート構造修正関数（モード・再購入ID列追加）
// ==========================================
function fixSheetStructure() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "2026-01 住所情報";
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    Logger.log("❌ シート「" + sheetName + "」が見つかりません");
    SpreadsheetApp.getUi().alert("シート「" + sheetName + "」が見つかりません");
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log("データがありません");
    SpreadsheetApp.getUi().alert("データがありません");
    return;
  }

  Logger.log("📊 " + (lastRow - 1) + " 件のデータを処理中...");

  // 現在のデータを取得（ヘッダー含む）
  var allData = sheet.getRange(1, 1, lastRow, 13).getValues();

  // シートをクリア
  sheet.clear();

  // 新しいヘッダーを設定
  var newHeaders = [
    "受信日時",
    "注文ID",
    "患者ID",
    "商品コード",
    "モード",
    "再購入ID",
    "口座名義",
    "電話番号",
    "メールアドレス",
    "郵便番号",
    "住所",
    "ステータス",
    "送信日時"
  ];

  sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
  sheet.getRange(1, 1, 1, newHeaders.length).setFontWeight("bold").setBackground("#f3f3f3");

  // 既存データを新しい構造に移行
  var newData = [];
  for (var i = 1; i < allData.length; i++) {
    var oldRow = allData[i];

    // 旧構造から新構造へ変換
    var newRow = [
      oldRow[0],  // A: 受信日時
      oldRow[1],  // B: 注文ID
      oldRow[2],  // C: 患者ID
      oldRow[3],  // D: 商品コード
      "current",  // E: モード (デフォルト値 - 後で手動修正)
      "",         // F: 再購入ID (空欄 - 後で手動修正)
      oldRow[4],  // G: 口座名義
      oldRow[5],  // H: 電話番号
      oldRow[6],  // I: メールアドレス
      oldRow[7],  // J: 郵便番号
      oldRow[8],  // K: 住所
      "confirmed", // L: ステータス (★ 強制的にconfirmed)
      oldRow[10]  // M: 送信日時
    ];

    newData.push(newRow);
  }

  // 新しいデータを書き込み
  if (newData.length > 0) {
    sheet.getRange(2, 1, newData.length, newHeaders.length).setValues(newData);
  }

  Logger.log("✅ 完了: " + newData.length + " 件のデータを移行しました");
  Logger.log("📝 手動確認が必要:");
  Logger.log("  - 再購入の行（patient_id: 20251200404）のE列を「reorder」、F列を「322」に変更");

  SpreadsheetApp.getUi().alert(
    "完了!\n\n" +
    newData.length + " 件のデータを移行しました。\n\n" +
    "ステータスは全て「confirmed」に設定されました。\n\n" +
    "手動確認:\n" +
    "- 再購入の行があれば、モード列を「reorder」、再購入ID列にIDを入力してください。"
  );
}

// ==========================================
// テスト関数
// ==========================================
function testHandleBankTransferOrder() {
  var testBody = {
    type: "bank_transfer_order",
    order_id: "123",
    patient_id: "20251200001",
    product_code: "MJL_2.5mg_1m",  // ★ 新しい商品コード
    mode: "first",  // ★ 追加
    reorder_id: null,  // ★ 追加
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
