/**
 * Square Webhook 受信 → シートに
 * order_datetime, name(配送先), postal, address, email, phone,
 * items, amount, name(請求先), payment_id, product_code, patient_id を書き込む
 *
 * Script Properties:
 *  - SQUARE_ACCESS_TOKEN
 *  - SQUARE_ENV          : "sandbox" or "production"
 *  - SHEET_ID
 *  - SHEET_NAME
 *  - REORDER_WEBAPP_URL  : 再処方GAS WebアプリURL（https://script.google.com/macros/s/XXXX/exec）
 */

  // のなめツール（Webhook → マスター転記）
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  // のなめツール（Webhook → のなめマスター）
  ui.createMenu("のなめツール")
    .addItem("選択行を のなめマスター に転記", "copySelectedToNonameMaster")
    .addToUi();

  // のなめ同期（問診 → のなめマスター）
  ui.createMenu("のなめ同期")
    .addItem("問診から user_id を補完", "syncUserIdFromIntakeToMaster")
    .addToUi();

  // 発送（のなめマスター → 発送ブック）
  ui.createMenu("発送")
    .addItem(
      "選択行を当日発送リストへ転記（当日シート自動作成／追記）",
      "copySelectedToDailyShippingList"
    )
    .addToUi();
/*
  // ★ Square API 補完
  ui.createMenu("Square補完")
    .addItem("選択行の配送情報をAPIで補完", "fillSelectedRowsBySquareApi")
    .addItem("Square転記を最新まで追記（API）", "appendSquareLatestByApi")
    .addSeparator()
    .addItem("Webhookキュー処理（手動）", "processSquareWebhookQueue")     // ★追加
    .addItem("Webhookキュートリガー作成（1分毎）", "setupWebhookQueueTrigger") // ★追加
    .addToUi();
    */
      ui.createMenu("一括")
    .addItem("①Webhook→②マスター転記→③UID補完→④発送転記（選択行）", "runAll_fromWebhookSelection")
    .addToUi();

}

const WEBHOOK_QUEUE_SHEET = "Square Webhook Queue";

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty("SHEET_ID");
    var sheetName = props.getProperty("SHEET_NAME") || "Square Webhook";
    if (!sheetId) return _textResponse("ok");

    var bodyText = e && e.postData && e.postData.contents ? String(e.postData.contents) : "{}";
    var body = {};
    try { body = JSON.parse(bodyText); } catch (err) { return _textResponse("ok"); }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    ensureWebhookHeader_(sheet);

    // 同時実行は短いtryLockで抑える（待ちで詰まらせない）
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(8000)) return _textResponse("ok");

    try {
      var kind = String(body.kind || "");

      // 1) payment_status（COMPLETED以外のステータス更新）
      if (kind === "payment_status") {
        var paymentId = String(body.payment_id || "");
        var st = String(body.payment_status || "");
        if (paymentId) upsertPaymentStatusOnly_(sheet, paymentId, st);
        return _textResponse("ok");
      }

      // 2) payment_completed（完成行）
      if (kind === "payment_completed") {
        var paymentId2 = String(body.payment_id || "");
        if (!paymentId2) return _textResponse("ok");

        var orderDateTime = _toJstString(String(body.order_datetime_iso || body.created_at_iso || ""));
        upsertCompletedPaymentRow_(sheet, paymentId2, {
          order_datetime: orderDateTime,
          ship_name: String(body.ship_name || ""),
          postal: String(body.postal || ""),
          address: String(body.address || ""),
          email: String(body.email || ""),
          phone: String(body.phone || ""),
          items: String(body.items || ""),
          amount: String(body.amount || ""),
          billing_name: String(body.billing_name || ""),
          product_code: String(body.product_code || ""),
          patient_id: String(body.patient_id || ""),
          order_id: String(body.order_id || ""),
          payment_status: "COMPLETED",
        });

          // ★★★ キャッシュ削除はVercel側で実行済み（多層防御として残す場合のみ） ★★★
  var patientIdForCache = String(body.patient_id || "").trim();
  if (patientIdForCache) {
    invalidateMypageCache_(patientIdForCache);
  } else {
    Logger.log("[doPost] payment_completed: patient_id not provided, cache not invalidated");
  }

        // 再処方 paid 通知が必要なら "ここで" ではなく、
        // Next側から再処方GASへ直接叩くのがおすすめ（GASのUrlFetchをゼロに保つため）
        return _textResponse("ok");
      }

      // 3) refund（返金列更新）
      if (kind === "refund") {
        var pid = String(body.payment_id || "");
        if (!pid) return _textResponse("ok");

        var refundedAtJst = _toJstString(String(body.refunded_at_iso || ""));
        var patientId = upsertRefundToRow_(sheet, pid, {
          refund_status: String(body.refund_status || ""),
          refunded_amount: String(body.refunded_amount || ""),
          refunded_at: refundedAtJst,
          refund_id: String(body.refund_id || ""),
        });

          // ★★★ ここ（返金反映が終わった直後） ★★★
  if (patientId) invalidateMypageCache_(patientId);
        return _textResponse("ok");
      }

      // 4) merge_patients（患者統合）
      if (kind === "merge_patients") {
        var oldPid = String(body.old_patient_id || "").trim();
        var newPid = String(body.new_patient_id || "").trim();

        if (!oldPid || !newPid) {
          return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "patient_ids_required" }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        if (oldPid === newPid) {
          return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "same_patient_id" }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        var nonameMasterSheet = ss.getSheetByName("のなめマスター");
        if (!nonameMasterSheet) {
          Logger.log("[merge_patients] のなめマスター not found");
          return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "noname_master_not_found" }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        var lastRow = nonameMasterSheet.getLastRow();
        var updated = 0;

        if (lastRow >= 2) {
          for (var i = 2; i <= lastRow; i++) {
            var currentPid = String(nonameMasterSheet.getRange(i, 16).getValue() || "").trim(); // P列
            if (currentPid === oldPid) {
              nonameMasterSheet.getRange(i, 16).setValue(newPid);
              updated++;
            }
          }
        }

        Logger.log("[merge_patients] のなめマスター: Updated " + updated + " rows (" + oldPid + " -> " + newPid + ")");
        return ContentService.createTextOutput(JSON.stringify({ ok: true, updated: updated }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      return _textResponse("ok");
    } finally {
      try { lock.releaseLock(); } catch (e2) {}
    }

  } catch (err) {
    return _textResponse("ok");
  }
}

function paymentIdExists_(sheet, paymentId) {
  if (!paymentId) return false;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false; // ヘッダーのみ

  // ヘッダーから payment_id 列を特定（列の増減に強い）
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colPaymentId = header.indexOf("payment_id") + 1;
  if (colPaymentId <= 0) return false;

  var range = sheet.getRange(2, colPaymentId, lastRow - 1, 1);

  var tf = range
    .createTextFinder(String(paymentId))
    .matchEntireCell(true)
    .matchCase(true);

  return !!tf.findNext();
}
function normalizeJapanesePhone_(raw) {
  if (raw == null) return "";
  var s = String(raw).trim();
  if (!s) return "";

  var digits = s.replace(/[^\d]/g, "");
  if (!digits) return "";

  // 81(国番号)が先頭のとき
  if (digits.indexOf("81") === 0) {
    var rest = digits.slice(2); // 81の後ろ

    // rest が "70..." / "80..." / "90..." のような携帯短表記なら 0 + rest
    if (/^(70|80|90)/.test(rest)) {
      digits = "0" + rest;       // 81080 -> 080, 8190 -> 090
    } else {
      digits = "0" + rest;       // 通常の 81xxxx も 0xxxx に寄せる
    }
  }

  // 0無しの短表記（90/80/70）も 0付与
  if (digits.charAt(0) !== "0" && /^(70|80|90)/.test(digits)) {
    digits = "0" + digits;
  }

  return digits;
}

/**
 * Orders API で order を1件取得
 */
function _fetchOrder(orderId) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("SQUARE_ACCESS_TOKEN");
  var env = props.getProperty("SQUARE_ENV") || "production";

  var baseUrl =
    env === "sandbox"
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com";

  var url = baseUrl + "/v2/orders/batch-retrieve";

  var payload = {
    order_ids: [orderId],
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + token,
      "Square-Version": "2024-04-17",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var res = UrlFetchApp.fetch(url, options);
  var code = res.getResponseCode();
  if (code !== 200) {
    Logger.log("Orders API error " + code + " " + res.getContentText());
    return null;
  }

  var json = JSON.parse(res.getContentText());
  if (!json.orders || !json.orders.length) return null;
  return json.orders[0];
}

/**
 * UTC ISO文字列 → JST "yyyy/MM/dd HH:mm:ss"
 */
function _toJstString(isoString) {
  try {
    if (!isoString) return "";
    var date = new Date(isoString); // UTC として解釈される
    return Utilities.formatDate(date, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
  } catch (e) {
    Logger.log("_toJstString error: " + e);
    return "";
  }
}

/**
/**
 * シンプルなテキストレスポンス
 */
function _textResponse(text, statusCode) {
  return ContentService.createTextOutput(text || "")
    .setMimeType(ContentService.MimeType.TEXT);
  // Apps Script の TextOutput には setResponseCode が無いので使わない
  // ステータスコードは常に 200 で返る（Square 的には 200 でOK）
}


/**
 * note から "Reorder:◯◯" を抜き出す
 * 例: "PID:xxx;Product:MJL_5mg_3m (reorder);Reorder:12" → "12"
 */
function extractReorderIdFromNote_(note) {
  if (!note) return "";
  var text = String(note);
  var parts = text.split(";");
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (p.indexOf("Reorder:") === 0) {
      return p.replace("Reorder:", "").trim();
    }
  }
  return "";
}

/**
 * 手動テスト用
 * Apps Script エディタから testDoPost を実行すると、
 * doPost(e) が呼ばれてログを確認できる。
 */
function testDoPost() {
  var sampleEvent = {
    type: "payment.updated",
    data: {
      object: {
        payment: {
          id: "TEST_PAYMENT_ID_" + new Date().getTime(),
          status: "COMPLETED",
          created_at: new Date().toISOString(),
          order_id: null, // order は無し
          amount_money: { amount: 13000, currency: "JPY" },
          note:
            "PID:20251200006;Product:MJL_2.5mg_1m (reorder);Reorder:12",
          billing_address: null,
          card_details: null,
        },
      },
    },
  };

  var e = {
    postData: {
      contents: JSON.stringify(sampleEvent),
      type: "application/json",
    },
  };

  var res = doPost(e);
  Logger.log("testDoPost result: " + res.getContent());
}

/**
 * シート名は必要に応じて変更してください
 */
const SHEET_NAME_WEBHOOK = "Square Webhook"; // Webhook シート名
const SHEET_NAME_MASTER  = "のなめマスター";  // のなめマスターのシート名


/**
 * Square Webhook シートで選択中の行を、
 * のなめマスターの「データが入っている最終行の1つ下」に追記する。
 */
/**
 * Square Webhook シートで選択中の行を、
 * のなめマスターの「データが入っている最終行の1つ下」に追記する。
 *
 * 追加要件：
 * - refund_status が空でない行（pending/completed等）は転記しない
 * - payment_status が FAILED の行は転記しない
 */
function copySelectedToNonameMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const activeSheetName = activeSheet.getName();
  const masterSheet  = ss.getSheetByName(SHEET_NAME_MASTER);

  // Square Webhookまたは銀行振込シートのみ転記可能
  if (activeSheetName !== SHEET_NAME_WEBHOOK && activeSheetName !== BANK_TRANSFER_SHEET) {
    SpreadsheetApp.getUi().alert(
      "転記元シートは「" + SHEET_NAME_WEBHOOK + "」または「" + BANK_TRANSFER_SHEET + "」シートで選択してください。\n" +
      "現在: " + activeSheetName
    );
    return;
  }

  if (!masterSheet) {
    SpreadsheetApp.getUi().alert("のなめマスター シートが見つかりません: " + SHEET_NAME_MASTER);
    return;
  }

  const range = activeSheet.getActiveRange();
  if (!range) {
    SpreadsheetApp.getUi().alert("転記したい行を選択してください。");
    return;
  }

  const values = range.getValues();
  const startRow = range.getRow();

  // ヘッダー行（1行目）を飛ばす
  const picked = [];
  for (let i = 0; i < values.length; i++) {
    const sheetRowIndex = startRow + i;
    if (sheetRowIndex === 1) continue;
    picked.push({ rowValues: values[i], rowIndex: sheetRowIndex });
  }

  if (picked.length === 0) {
    SpreadsheetApp.getUi().alert("ヘッダー以外の行が選択されていませんでした。");
    return;
  }

  // --- ヘッダーから必要列を特定（列追加に強い） ---
  const header = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
  const col = (name) => {
    const idx = header.indexOf(name);
    return idx >= 0 ? idx : -1; // 0-based
  };

  // 既存の固定列（あなたのシート構造に合わせたヘッダー名）
  const cOrderDatetime = col("order_datetime");
  const cShipName      = col("name（配送先）");
  const cPostal        = col("postal");
  const cAddress       = col("address");
  const cEmail         = col("email");
  const cPhone         = col("phone");
  const cItems         = col("items");
  const cAmount        = col("amount");
  const cPaymentId     = col("payment_id");
  const cProductCode   = col("productCode");
  const cPatientId     = col("patientId");

  // ★ フィルタ条件列
  const cPaymentStatus = col("payment_status");
  const cRefundStatus  = col("refund_status");

  // 最低限必要な列チェック
  if (cPaymentId < 0) {
    SpreadsheetApp.getUi().alert("Webhookシートに payment_id 列が見つかりません。");
    return;
  }

  const rowsToAppend = [];
  let skipped = 0;
  let skippedRefund = 0;
  let skippedFailed = 0;

  for (let i = 0; i < picked.length; i++) {
    const row = picked[i].rowValues;

    // --- フィルタ判定 ---
    const refundStatus = cRefundStatus >= 0 ? String(row[cRefundStatus] || "").trim() : "";
    if (refundStatus) {
      skipped++;
      skippedRefund++;
      continue;
    }

    const paymentStatus = cPaymentStatus >= 0 ? String(row[cPaymentStatus] || "").trim().toUpperCase() : "";
    if (paymentStatus === "FAILED") {
      skipped++;
      skippedFailed++;
      continue;
    }

    // --- 値取得（列が無い場合は空） ---
    const orderDatetime = cOrderDatetime >= 0 ? row[cOrderDatetime] : "";
    const name          = cShipName      >= 0 ? row[cShipName]      : "";
    const postal        = cPostal        >= 0 ? row[cPostal]        : "";
    const address       = cAddress       >= 0 ? row[cAddress]       : "";
    const email         = cEmail         >= 0 ? row[cEmail]         : "";
    const phone         = normalizeJapanesePhone_(cPhone >= 0 ? row[cPhone] : "");
    const items         = cItems         >= 0 ? row[cItems]         : "";
    const amount        = cAmount        >= 0 ? row[cAmount]        : "";
    const paymentId     = String(row[cPaymentId] || "").trim();
    const productCode   = cProductCode   >= 0 ? row[cProductCode]   : "";
    const patientId     = cPatientId     >= 0 ? row[cPatientId]     : "";

    if (!paymentId) {
      // payment_id 無いのは事故りやすいのでスキップ（必要なら転記してもOK）
      skipped++;
      continue;
    }

    // ★ のなめマスター 1行分（A〜W: 23列分）
    const masterRow = [
      "",            // A user_id
      orderDatetime, // B 決済日時
      name,          // C Name
      postal,        // D Postal Code
      address,       // E Address
      email,         // F Email
      phone,         // G Phone
      items,         // H Product Name
      amount,        // I Price
      "",            // J 2.5mg
      "",            // K 5mg
      "",            // L 7.5mg
      "",            // M 10mg
      "",            // N cash
      "",            // O check
      patientId,     // P patient_id
      paymentId,     // Q payment_id
      productCode,   // R product_code
      "",            // S source
      "",            // T shipping_status
      "",            // U shipping_date
      "",            // V tracking_number
      "",            // W note
    ];

    rowsToAppend.push(masterRow);
  }

  if (rowsToAppend.length === 0) {
    SpreadsheetApp.getUi().alert(
      "転記対象がありませんでした。\n" +
      "スキップ: " + skipped + "（refund_status有: " + skippedRefund + " / payment_status=FAILED: " + skippedFailed + "）"
    );
    return;
  }

  const lastRow = masterSheet.getLastRow();
  const startRowMaster = lastRow + 1;

  masterSheet
    .getRange(startRowMaster, 1, rowsToAppend.length, rowsToAppend[0].length)
    .setValues(rowsToAppend);
// pay_master_index は使わない（行ズレ事故の原因になるため

  // ★ Supabaseにも同期
  try {
    syncNonameMasterRowsToSupabase_(rowsToAppend);
  } catch (e) {
    Logger.log("[copySelectedToNonameMaster] Supabase sync failed: " + e);
  }

  SpreadsheetApp.getUi().alert(
    rowsToAppend.length + "件を のなめマスター に転記しました。\n" +
    "スキップ: " + skipped + "（refund_status有: " + skippedRefund + " / payment_status=FAILED: " + skippedFailed + "）"
  );
}
function upsertPayMasterIndexFromRows_(masterSheet, startRow, count) {
  const idx = ensurePayMasterIndexSheet_();
  const COL_PAY = 17; // Q

  const pays = masterSheet.getRange(startRow, COL_PAY, count, 1).getDisplayValues();

  const ts = nowJst_();
  for (let i = 0; i < pays.length; i++) {
    const pay = String(pays[i][0] || "").trim();
    if (!pay) continue;
    upsertPayMasterIndex_(idx, pay, startRow + i, ts);
  }
}

function upsertPayMasterIndex_(idxSheet, paymentId, rowNumber, ts) {
  const pay = String(paymentId || "").trim();
  const row = Number(rowNumber);
  if (!pay || !Number.isFinite(row) || row < 2) return;

  const last = idxSheet.getLastRow();
  if (last >= 2) {
    const rng = idxSheet.getRange(2, 1, last - 1, 1);
    const cell = rng.createTextFinder(pay).matchEntireCell(true).findNext();
    if (cell) {
      const r = cell.getRow();
      idxSheet.getRange(r, 2).setValue(row);
      idxSheet.getRange(r, 3).setValue(ts);
      return;
    }
  }
  idxSheet.appendRow([pay, row, ts]);
}


/**
 * 別ブックにある「問診」ブックの ID とシート名
 * ※ 必ず自分の環境のID/シート名に置き換えてください
 */
const INTAKE_SPREADSHEET_ID = "1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo";  // 1j9... のようなID
const INTAKE_SHEET_NAME     = "問診";

/**
 * このスクリプトは「のなめマスター」ブック側に置く想定
 * 今開いているスプレッドシートの中に「のなめマスター」シートがある前提
 */
const MASTER_SHEET_NAME     = "のなめマスター";

/**
 * 問診ブックの patient_id → answerer_id（LステID）を、
 * のなめマスターの user_id に埋める。
 * （マスター側に patient_id が入っていて、user_id が空の行だけ更新）
 */
function syncUserIdFromIntakeToMaster() {
  const intakeSS    = SpreadsheetApp.openById(INTAKE_SPREADSHEET_ID);
  const intakeSheet = intakeSS.getSheetByName(INTAKE_SHEET_NAME);
  const masterSS    = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = masterSS.getSheetByName(MASTER_SHEET_NAME);

  if (!intakeSheet) {
    SpreadsheetApp.getUi().alert("問診シートが見つかりません: " + INTAKE_SHEET_NAME);
    return;
  }
  if (!masterSheet) {
    SpreadsheetApp.getUi().alert("のなめマスター シートが見つかりません: " + MASTER_SHEET_NAME);
    return;
  }

  const iLastRow = intakeSheet.getLastRow();
  const mLastRow = masterSheet.getLastRow();
  if (iLastRow < 2 || mLastRow < 2) {
    SpreadsheetApp.getUi().alert("問診 or のなめマスター にデータがありません。");
    return;
  }

  // ---- 問診側: patient_id → answerer_id map ----
  const iColCount = intakeSheet.getLastColumn();
  const iValues = intakeSheet.getRange(2, 1, iLastRow - 1, iColCount).getValues();

  const I_COL_ANSWERER_ID = 25; // Y
  const I_COL_PATIENT_ID  = 26; // Z

  const mapPidToUserId = {};
  for (let i = 0; i < iValues.length; i++) {
    const row = iValues[i];
    const pid = String(row[I_COL_PATIENT_ID - 1] || "").trim();
    const uid = String(row[I_COL_ANSWERER_ID - 1] || "").trim();
    if (pid && uid) mapPidToUserId[pid] = uid;
  }

  // ---- のなめマスター側: A列だけ更新 ----
  // A:user_id と P:patient_id だけ読めば十分
  const userIdRange = masterSheet.getRange(2, 1, mLastRow - 1, 1);   // A
  const pidRange    = masterSheet.getRange(2, 16, mLastRow - 1, 1);  // P

  const userIds = userIdRange.getValues(); // [[...],[...]]
  const pids    = pidRange.getValues();

  let updateCount = 0;

  for (let r = 0; r < userIds.length; r++) {
    const currentUserId = String(userIds[r][0] || "").trim();
    const pid = String(pids[r][0] || "").trim();
    if (currentUserId) continue;
    if (!pid) continue;

    const uid = mapPidToUserId[pid];
    if (!uid) continue;

    userIds[r][0] = uid;
    updateCount++;
  }

  if (updateCount > 0) {
    userIdRange.setValues(userIds); // ★ A列だけ書く（J〜Mは絶対に触らない）
  }

  SpreadsheetApp.getUi().alert("user_id を " + updateCount + "件補完しました。");
}


/***************
 * 設定
 ***************/
const SHIPPING_SPREADSHEET_ID = "13A9pmDTc8LprBAet5WG_LvwnocFfJBTwwZFMM1-50oM"; // 発送ブック
const TZ = "Asia/Tokyo";

// 当日発送シート名（好みで変更可）
// 例：発送_2025-12-12
function getTodayShippingSheetName_() {
  const d = new Date();
  return Utilities.formatDate(d, TZ, "MM/dd"); // 例: 12/12
}


/**
 * のなめマスターで選択した行だけを、
 * 発送ブックの当日シートへ並び替えて追記する。
 * - 当日シートが無ければ作成
 * - あれば最下行の下に追記
 * - 並び順：2.5→5→7.5→10 / 本数降順
 */
function copySelectedToDailyShippingList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName("のなめマスター") || ss.getActiveSheet();

  const range = sourceSheet.getActiveRange();
  if (!range) {
    SpreadsheetApp.getUi().alert("のなめマスターで転記したい行を選択してください。");
    return;
  }

  const values = range.getValues();
  const startRow = range.getRow();

  // ヘッダー行を選択しているケースを除外
  const picked = [];
  for (let i = 0; i < values.length; i++) {
    const sheetRow = startRow + i;
    if (sheetRow === 1) continue; // 1行目はヘッダー想定
    picked.push(values[i]);
  }

  if (picked.length === 0) {
    SpreadsheetApp.getUi().alert("ヘッダー以外の行が選択されていません。");
    return;
  }

  // --- のなめマスター列（0-based, A=0） ---
  const COL_USER_ID      = 0;   // A user_id
  const COL_PAYMENT_DT   = 1;   // B 決済日時
  const COL_NAME         = 2;   // C Name
  const COL_POSTAL       = 3;   // D Postal Code
  const COL_ADDRESS      = 4;   // E Address
  const COL_EMAIL        = 5;   // F Email
  const COL_PHONE        = 6;   // G Phone
  const COL_PRODUCT_NAME = 7;   // H Product Name
  const COL_PRICE        = 8;   // I Price
  const COL_25           = 9;   // J 2.5mg
  const COL_5            = 10;  // K 5mg
  const COL_75           = 11;  // L 7.5mg
  const COL_10           = 12;  // M 10mg
  const COL_PATIENT_ID   = 15;  // P patient_id
  const COL_PAYMENT_ID   = 16;  // Q payment_id
  const COL_TRACKING     = 21;  // V tracking_number

  // 転記先のヘッダー（固定）
  const outHeader = [
    "user_id",
    "決済日時",
    "Name",
    "Postal Code",
    "Address",
    "Email",
    "Phone",
    "Product Name",
    "Price",
    "2.5mg",
    "5mg",
    "7.5mg",
    "10mg",
    "patient_id",
    "payment_id",
    "tracking_number",
  ];

  // 選択行を「並び替え用キー付き」にして作る
  const rowsWithKey = [];

  for (let i = 0; i < picked.length; i++) {
    const row = picked[i];

    const v25 = Number(row[COL_25]) || 0;
    const v5  = Number(row[COL_5])  || 0;
    const v75 = Number(row[COL_75]) || 0;
    const v10 = Number(row[COL_10]) || 0;

    let mgPriority = null;
    let qty = 0;

    if (v25 > 0) { mgPriority = 1; qty = v25; }
    else if (v5 > 0) { mgPriority = 2; qty = v5; }
    else if (v75 > 0) { mgPriority = 3; qty = v75; }
    else if (v10 > 0) { mgPriority = 4; qty = v10; }
    else continue; // 4用量すべて0 → 対象外

    const outRow = [
      row[COL_USER_ID],
      row[COL_PAYMENT_DT],
      row[COL_NAME],
      row[COL_POSTAL],
      row[COL_ADDRESS],
      row[COL_EMAIL],
      row[COL_PHONE],
      row[COL_PRODUCT_NAME],
      row[COL_PRICE],
      row[COL_25],
      row[COL_5],
      row[COL_75],
      row[COL_10],
      row[COL_PATIENT_ID],
      row[COL_PAYMENT_ID],
      row[COL_TRACKING],
    ];

    rowsWithKey.push({ mgPriority, qty, outRow });
  }

  if (rowsWithKey.length === 0) {
    SpreadsheetApp.getUi().alert("転記対象がありません（mg列が全て0の行のみ選択されています）。");
    return;
  }

  // 並び替え：mg昇順 → 本数降順
  rowsWithKey.sort((a, b) => {
    if (a.mgPriority !== b.mgPriority) return a.mgPriority - b.mgPriority;
    return b.qty - a.qty;
  });

  const output = rowsWithKey.map(x => x.outRow);

  // --- 発送ブックの当日シートへ追記 ---
  const shipSS = SpreadsheetApp.openById(SHIPPING_SPREADSHEET_ID);
  const sheetName = getTodayShippingSheetName_();

  let targetSheet = shipSS.getSheetByName(sheetName);
  if (!targetSheet) {
    targetSheet = shipSS.insertSheet(sheetName);
  }

  // ヘッダーが無ければ入れる
  const lastRow = targetSheet.getLastRow();
  if (lastRow === 0) {
    targetSheet.getRange(1, 1, 1, outHeader.length).setValues([outHeader]);
  } else {
    const first = targetSheet.getRange(1, 1, 1, outHeader.length).getValues()[0];
    if (String(first[0] || "").trim() !== "user_id") {
      // 1行目がヘッダーでなければ、上に入れる
      targetSheet.insertRowBefore(1);
      targetSheet.getRange(1, 1, 1, outHeader.length).setValues([outHeader]);
    }
  }

  // 追記（最下行の下）
  const appendRowStart = targetSheet.getLastRow() + 1;
  targetSheet.getRange(appendRowStart, 1, output.length, outHeader.length).setValues(output);

    // ★ 追加：同一氏名（同一人物）を色付け
  highlightDuplicateNamesInDailySheet_(targetSheet);

  SpreadsheetApp.getUi().alert(
    `発送ブック「${sheetName}」に ${output.length} 行追記しました（2.5→5→7.5→10 / 本数降順）。`
  );
}

function fillShippingInfoByApi_(sheet, rowIndex) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("SQUARE_ACCESS_TOKEN");
  const env = props.getProperty("SQUARE_ENV") || "production";
  if (!token) return;

  const baseUrl =
    env === "sandbox"
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com";

  // ヘッダーから列位置を特定（列ズレに強い）
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = (name) => header.indexOf(name) + 1;

  const cName    = col("name（配送先）");
  const cPostal  = col("postal");
  const cAddress = col("address");
  const cEmail   = col("email");
  const cPhone   = col("phone");
  const cItems   = col("items");
  const cPayId   = col("payment_id");
  const cOrderId = col("order_id");

  if (!cPayId) return;

  const paymentId = String(sheet.getRange(rowIndex, cPayId).getValue() || "").trim();
  if (!paymentId) return;

  // --- 1) payment 取得（email/phone/order_id） ---
  const payRes = UrlFetchApp.fetch(`${baseUrl}/v2/payments/${encodeURIComponent(paymentId)}`, {
    method: "get",
    headers: { Authorization: "Bearer " + token, "Square-Version": "2024-04-17" },
    muteHttpExceptions: true,
  });
  if (payRes.getResponseCode() !== 200) return;

  const payJson = JSON.parse(payRes.getContentText() || "{}");
  const P = payJson.payment || {};

  let email = String((P.buyer_email_address || P.receipt_email || "")).trim();
  let phone = "";

  // customer からも補完
  if (P.customer_id) {
    try {
      const cRes = UrlFetchApp.fetch(`${baseUrl}/v2/customers/${encodeURIComponent(P.customer_id)}`, {
        method: "get",
        headers: { Authorization: "Bearer " + token, "Square-Version": "2024-04-17" },
        muteHttpExceptions: true,
      });
      if (cRes.getResponseCode() === 200) {
        const cJson = JSON.parse(cRes.getContentText() || "{}");
        const C = cJson.customer || {};
        if (!email && C.email_address) email = String(C.email_address).trim();
        if (C.phone_number) phone = String(C.phone_number).trim();
      }
    } catch (e) {}
  }

  // order_id を確定（payment優先、無ければシート）
  const orderId =
    String(P.order_id || "").trim() ||
    (cOrderId ? String(sheet.getRange(rowIndex, cOrderId).getValue() || "").trim() : "");

  if (cOrderId && orderId) sheet.getRange(rowIndex, cOrderId).setValue(orderId);

  // --- 2) order 取得（住所/items） ---
  if (orderId) {
    const oRes = UrlFetchApp.fetch(`${baseUrl}/v2/orders/batch-retrieve`, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + token, "Square-Version": "2024-04-17" },
      payload: JSON.stringify({ order_ids: [orderId] }),
      muteHttpExceptions: true,
    });

    if (oRes.getResponseCode() === 200) {
      const oJson = JSON.parse(oRes.getContentText() || "{}");
      const order = (oJson.orders && oJson.orders[0]) ? oJson.orders[0] : null;

      if (order) {
        // items（空なら埋める）
        if (cItems) {
          const curItems = String(sheet.getRange(rowIndex, cItems).getValue() || "").trim();
          if (!curItems) {
            const itemsText = (order.line_items || [])
              .map(li => `${li.name || ""} x ${li.quantity || "1"}`.trim())
              .filter(Boolean)
              .join(" / ");
            if (itemsText) sheet.getRange(rowIndex, cItems).setValue(itemsText);
          }
        }

        // recipient（shipment_details）があれば住所/氏名/電話/メールを補完
        const f0 = (order.fulfillments && order.fulfillments[0]) ? order.fulfillments[0] : null;
        const rec = f0 && f0.shipment_details && f0.shipment_details.recipient ? f0.shipment_details.recipient : null;

        if (rec) {
          const shipName = String(rec.display_name || "").trim();
          const recPhone = String(rec.phone_number || "").trim();
          const recEmail = String(rec.email_address || "").trim();

          if (cName && shipName) sheet.getRange(rowIndex, cName).setValue(shipName);

          if (cPhone) {
            const curP = String(sheet.getRange(rowIndex, cPhone).getValue() || "").trim();
            if (!curP && (recPhone || phone)) sheet.getRange(rowIndex, cPhone).setValue(recPhone || phone);
          }

          if (cEmail) {
            const curE = String(sheet.getRange(rowIndex, cEmail).getValue() || "").trim();
            if (!curE && (recEmail || email)) sheet.getRange(rowIndex, cEmail).setValue(recEmail || email);
          }

          const addr = rec.address || {};
          const postal = String(addr.postal_code || "").trim();
          const parts = [
            addr.administrative_district_level_1,
            addr.locality,
            addr.address_line_1,
            addr.address_line_2,
          ].filter(Boolean);
          const address = parts.join("").trim();

          if (cPostal && postal) sheet.getRange(rowIndex, cPostal).setValue(postal);
          if (cAddress && address) sheet.getRange(rowIndex, cAddress).setValue(address);
        }
      }
    }
  }

  // --- 最後に email/phone は「空なら」必ず埋める（order_id が無い/recipientが無いケース対策） ---
  if (cEmail) {
    const curE = String(sheet.getRange(rowIndex, cEmail).getValue() || "").trim();
    if (!curE && email) sheet.getRange(rowIndex, cEmail).setValue(email);
  }
  if (cPhone) {
    const curP = String(sheet.getRange(rowIndex, cPhone).getValue() || "").trim();
    if (!curP && phone) sheet.getRange(rowIndex, cPhone).setValue(phone);
  }
}


/**
 * Square Webhook シートで選択中の行について、
 * payment_id を起点に Square API から配送情報（B〜F）を補完する
 */
function fillSelectedRowsBySquareApi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const range = sheet.getActiveRange();

  if (!range) {
    SpreadsheetApp.getUi().alert("補完したい行を選択してください。");
    return;
  }

  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = (name) => header.indexOf(name) + 1;

  const cPayId = col("payment_id");
  if (!cPayId) {
    SpreadsheetApp.getUi().alert("payment_id 列が見つかりません。");
    return;
  }

  const startRow = range.getRow();
  const numRows = range.getNumRows();

  let processed = 0;

  for (let r = startRow; r < startRow + numRows; r++) {
    if (r === 1) continue; // ヘッダー行スキップ

    const paymentId = String(sheet.getRange(r, cPayId).getValue() || "").trim();
    if (!paymentId) continue;

    // ここで API 補完本体を呼ぶ（次に定義）
    fillShippingInfoByApi_(sheet, r);
    processed++;
  }

  SpreadsheetApp.getUi().alert(
    `Square API で ${processed} 行の配送情報補完を実行しました。`
  );
}

function _fetchPayment(paymentId) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("SQUARE_ACCESS_TOKEN");
  var env = props.getProperty("SQUARE_ENV") || "production";

  var baseUrl =
    env === "sandbox"
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com";

  var res = UrlFetchApp.fetch(baseUrl + "/v2/payments/" + encodeURIComponent(paymentId), {
    method: "get",
    headers: {
      Authorization: "Bearer " + token,
      "Square-Version": "2024-04-17",
    },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) return null;
  return JSON.parse(res.getContentText());
}

function _fetchCustomer(customerId) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("SQUARE_ACCESS_TOKEN");
  var env = props.getProperty("SQUARE_ENV") || "production";

  var baseUrl =
    env === "sandbox"
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com";

  var res = UrlFetchApp.fetch(baseUrl + "/v2/customers/" + encodeURIComponent(customerId), {
    method: "get",
    headers: {
      Authorization: "Bearer " + token,
      "Square-Version": "2024-04-17",
    },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) return null;
  return JSON.parse(res.getContentText());
}
function ensureWebhookHeader_(sheet) {
  const baseHeader = [
    "order_datetime",
    "name（配送先）",
    "postal",
    "address",
    "email",
    "phone",
    "items",
    "amount",
    "name（請求先）",
    "payment_id",
    "productCode",   // ★ここ
    "patientId",     // ★ここ
    "order_id",
    // 追加列（末尾）
    "payment_status",
    "refund_status",
    "refunded_amount",
    "refunded_at",
    "refund_id",
  ];

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow === 0) {
    sheet.appendRow(baseHeader);
    return;
  }

  const header = sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
  // 既存ヘッダーに足りない列だけ追加（末尾）
  const headerSet = {};
  header.forEach(h => headerSet[String(h || "").trim()] = true);

  const toAdd = baseHeader.filter(h => !headerSet[h]);
  if (toAdd.length > 0) {
    sheet.getRange(1, header.length + 1, 1, toAdd.length).setValues([toAdd]);
  }
}

// 銀行振込CSV用ヘッダー（銀行から取得したCSVを貼り付ける用）
function ensureBankTransferCsvHeader_(sheet) {
  const baseHeader = [
    "振込日",
    "振込名義",
    "振込金額",
    "備考",
    "照合済み",        // 手動でチェック
    "該当patient_id", // 手動で記入
  ];

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow === 0) {
    sheet.appendRow(baseHeader);
    return;
  }

  const header = sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
  const headerSet = {};
  header.forEach(h => headerSet[String(h || "").trim()] = true);

  const toAdd = baseHeader.filter(h => !headerSet[h]);
  if (toAdd.length > 0) {
    sheet.getRange(1, header.length + 1, 1, toAdd.length).setValues([toAdd]);
  }
}

function headerMap_(sheet) {
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  for (let i = 0; i < header.length; i++) {
    const key = String(header[i] || "").trim();
    if (key) map[key] = i + 1; // 1-based col
  }
  return map;
}

function findRowByPaymentId_(sheet, paymentId) {
  if (!paymentId) return 0;
  const map = headerMap_(sheet);
  const colPay = map["payment_id"];
  if (!colPay) return 0;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const range = sheet.getRange(2, colPay, lastRow - 1, 1);
  const tf = range.createTextFinder(String(paymentId)).matchEntireCell(true).matchCase(true);
  const cell = tf.findNext();
  if (!cell) return 0;
  return cell.getRow();
}

function upsertPaymentStatusOnly_(sheet, paymentId, paymentStatus) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const map = headerMap_(sheet);
    const row = findRowByPaymentId_(sheet, paymentId);

    // 行が無い場合：行は消さない方針だが、ステータスだけでも記録したいので作る
    if (!row) {
      const newRow = new Array(sheet.getLastColumn()).fill("");
      newRow[map["payment_id"] - 1] = paymentId;
      if (map["payment_status"]) newRow[map["payment_status"] - 1] = paymentStatus;
      sheet.appendRow(newRow);
      return;
    }

    if (map["payment_status"]) sheet.getRange(row, map["payment_status"]).setValue(paymentStatus);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function upsertRefundToRow_(sheet, paymentId, data) {
  const map = headerMap_(sheet);
  const row = findRowByPaymentId_(sheet, paymentId);

  // patientId列（ヘッダ名 patientId を前提）
  const colPid = map["patientId"] || map["patient_id"] || 0;

  if (!row) {
    const newRow = new Array(sheet.getLastColumn()).fill("");
    if (map["payment_id"]) newRow[map["payment_id"] - 1] = paymentId;
    if (map["refund_status"]) newRow[map["refund_status"] - 1] = data.refund_status || "";
    if (map["refunded_amount"]) newRow[map["refunded_amount"] - 1] = data.refunded_amount || "";
    if (map["refunded_at"]) newRow[map["refunded_at"] - 1] = data.refunded_at || "";
    if (map["refund_id"]) newRow[map["refund_id"] - 1] = data.refund_id || "";

    const before = sheet.getLastRow();
    sheet.appendRow(newRow);
    // patientIdは不明なのでここでは索引更新しない（後でpayment_completedが来れば更新される）
    return null;
  }

  if (map["refund_status"]) sheet.getRange(row, map["refund_status"]).setValue(data.refund_status || "");
  if (map["refunded_amount"]) sheet.getRange(row, map["refunded_amount"]).setValue(data.refunded_amount || "");
  if (map["refunded_at"]) sheet.getRange(row, map["refunded_at"]).setValue(data.refunded_at || "");
  if (map["refund_id"]) sheet.getRange(row, map["refund_id"]).setValue(data.refund_id || "");

  // ★ ここでpatientIdを拾って索引更新し、返り値として返す
  var patientId = null;
  if (colPid) {
    const pid = String(sheet.getRange(row, colPid).getValue() || "").trim();
    if (pid) {
      pidWebhookIndexAddRow_(pid, row);
      patientId = pid;
    }
  }
  return patientId;
}

function upsertCompletedPaymentRow_(sheet, paymentId, d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const map = headerMap_(sheet);
    const row = findRowByPaymentId_(sheet, paymentId);

    const valuesByHeader = {
      "order_datetime": d.order_datetime || "",
      "name（配送先）": d.ship_name || "",
      "postal": d.postal || "",
      "address": d.address || "",
      "email": d.email || "",
      "phone": d.phone || "",
      "items": d.items || "",
      "amount": d.amount || "",
      "name（請求先）": d.billing_name || "",
      "payment_id": paymentId,
      "productCode": d.product_code || "",
      "patientId": d.patient_id || "",
      "order_id": d.order_id || "",
      "payment_status": d.payment_status || "COMPLETED",
    };

    if (!row) {
      const newRow = new Array(sheet.getLastColumn()).fill("");
      Object.keys(valuesByHeader).forEach(h => {
        if (map[h]) newRow[map[h] - 1] = valuesByHeader[h];
      });

      const before = sheet.getLastRow();
      sheet.appendRow(newRow);
      const writtenRow = before + 1;

      // ★ 索引更新（ここが初回高速化の鍵）
      pidWebhookIndexAddRow_(d.patient_id, writtenRow);
      return;
    }

    Object.keys(valuesByHeader).forEach(h => {
      if (!map[h]) return;
      sheet.getRange(row, map[h]).setValue(valuesByHeader[h]);
    });

    // ★ 既存行更新でも索引を更新して“最新扱い”に寄せる
    pidWebhookIndexAddRow_(d.patient_id, row);

  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function stats_noname_vs_2025() {
  const SS = SpreadsheetApp.getActiveSpreadsheet();

  const SHEET_2025 = "2025年全データ";
  const SHEET_NONAME = "のなめマスター";
  const SHEET_OUT = "統計";

  const sh2025 = SS.getSheetByName(SHEET_2025);
  const shN = SS.getSheetByName(SHEET_NONAME);
  if (!sh2025 || !shN) throw new Error("シート名が見つかりません");

  const v2025 = sh2025.getDataRange().getValues();
  const vN = shN.getDataRange().getValues();
  if (v2025.length < 2 || vN.length < 2) throw new Error("データ行不足");

  // ==== 列定義（0-based）====
  // 2025年全データ
  const IDX_2025_NAME  = 2 - 1; // B
  const IDX_2025_EMAIL = 5 - 1; // E
  const IDX_2025_PHONE = 6 - 1; // F

  // のなめマスター
  const IDX_N_NAME  = 3 - 1; // C
  const IDX_N_EMAIL = 6 - 1; // F
  const IDX_N_PHONE = 7 - 1; // G

  // ==== 照合用Set ====
  const emailSet = new Set();
  const phoneSet = new Set();
  const nameSet  = new Set();

  for (let r = 1; r < v2025.length; r++) {
    const email = normalizeEmail_(v2025[r][IDX_2025_EMAIL]);
    const phone = normalizePhoneJP_(v2025[r][IDX_2025_PHONE]);
    const name  = normalizeName_(v2025[r][IDX_2025_NAME]);

    if (email) emailSet.add(email);
    if (phone) phoneSet.add(phone);
    if (name)  nameSet.add(name);
  }

  // ==== 集計 ====
  let total = 0;
  let hitEither = 0;
  let hitEmail = 0;
  let hitPhone = 0;
  let hitName  = 0;
  let noKey = 0;
  let unmatched = 0;

  for (let r = 1; r < vN.length; r++) {
    total++;

    const email = normalizeEmail_(vN[r][IDX_N_EMAIL]);
    const phone = normalizePhoneJP_(vN[r][IDX_N_PHONE]);
    const name  = normalizeName_(vN[r][IDX_N_NAME]);

    const hasKey = !!email || !!phone || !!name;
    if (!hasKey) {
      noKey++;
      unmatched++;
      continue;
    }

    const mEmail = email && emailSet.has(email);
    const mPhone = phone && phoneSet.has(phone);
    const mName  = name  && nameSet.has(name);

    if (mEmail) hitEmail++;
    if (mPhone) hitPhone++;
    if (mName)  hitName++;

    if (mEmail || mPhone || mName) hitEither++;
    else unmatched++;
  }

  const rate = total ? hitEither / total : 0;

  // ==== 出力 ====
  let shOut = SS.getSheetByName(SHEET_OUT);
  if (!shOut) shOut = SS.insertSheet(SHEET_OUT);
  shOut.clearContents();

  const rows = [
    ["指標", "値"],
    ["のなめマスター総数", total],
    ["一致（Email）", hitEmail],
    ["一致（Phone）", hitPhone],
    ["一致（Name：スペース除去）", hitName],
    ["一致（Email OR Phone OR Name）", hitEither],
    ["不一致", unmatched],
    ["キー無し（Email/Phone/Name 全て空）", noKey],
    ["一致率", rate],
  ];

  shOut.getRange(1, 1, rows.length, 2).setValues(rows);
  shOut.getRange(rows.length, 2).setNumberFormat("0.00%");
  shOut.autoResizeColumns(1, 2);
}


// ================= helpers =================

function normalizeEmail_(v) {
  return (v ?? "").toString().trim().toLowerCase();
}

function normalizeName_(v) {
  let s = (v ?? "").toString().trim();
  if (!s) return "";

  // 全角→半角（英数）
  s = s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c =>
    String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
  );

  // 全角・半角スペース除去
  s = s.replace(/[\s　]+/g, "");

  return s;
}

function normalizePhoneJP_(v) {
  let s = (v ?? "").toString().trim();
  if (!s) return "";

  s = s.replace(/[^\d]/g, "");
  if (!s) return "";

  if (s.startsWith("81")) s = "0" + s.slice(2);
  if (!s.startsWith("0")) return "";

  return s;
}

function _listPayments_(beginIso, endIso, cursor) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("SQUARE_ACCESS_TOKEN");
  var env = props.getProperty("SQUARE_ENV") || "production";
  if (!token) throw new Error("SQUARE_ACCESS_TOKEN not set");

  var baseUrl =
    env === "sandbox"
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com";

  var qs = [];
  if (beginIso) qs.push("begin_time=" + encodeURIComponent(beginIso));
  if (endIso) qs.push("end_time=" + encodeURIComponent(endIso));
  if (cursor) qs.push("cursor=" + encodeURIComponent(cursor));
  qs.push("sort_order=ASC");
  qs.push("limit=100");

  var url = baseUrl + "/v2/payments" + (qs.length ? "?" + qs.join("&") : "");

  var res = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      Authorization: "Bearer " + token,
      "Square-Version": "2024-04-17",
    },
    muteHttpExceptions: true,
  });

  var code = res.getResponseCode();
  if (code !== 200) {
    throw new Error("List Payments error " + code + " " + res.getContentText());
  }
  return JSON.parse(res.getContentText() || "{}");
}
function _toUtcIsoFromJstDate_(dJst) {
  // dJst は Date（JSTで組んだDateでもJS内部はUTC保持）
  return new Date(dJst.getTime()).toISOString();
}
function _upsertFromPayment_(sheet, payment) {
  var paymentId = payment && payment.id ? String(payment.id) : "";
  if (!paymentId) return;

  // 既存ならスキップ（重複防止）
  if (findRowByPaymentId_(sheet, paymentId)) return;

  var status = String(payment.status || "");

  // COMPLETED以外はステータスだけ
  if (status !== "COMPLETED") {
    upsertPaymentStatusOnly_(sheet, paymentId, status);
    return;
  }

  // フル取得（あなたの既存方針）
  try {
    var fullPayment = _fetchPayment(paymentId);
    if (fullPayment && fullPayment.payment) payment = fullPayment.payment;
  } catch (e) {}

  var createdAt = payment.created_at || "";
  var orderId = payment.order_id || "";
  var note = payment.note || payment.payment_note || "";

  // note から pid/productCode/reorderId（あなたの既存と同等）
  var patientId = "";
  var productCode = "";
  if (note) {
    var pidMatch = note.match(/PID:([^;]+)/);
    if (pidMatch && pidMatch[1]) patientId = pidMatch[1].trim();

    var productMatch = note.match(/Product:([^\s(]+)/);
    if (productMatch && productMatch[1]) productCode = productMatch[1].trim();
  }

  var amountText = "";
  if (payment.amount_money && payment.amount_money.amount != null) {
    amountText = String(payment.amount_money.amount);
  }

  // Orders API
  var order = null;
  try { if (orderId) order = _fetchOrder(orderId); } catch (e) { order = null; }

  var orderDateTime = _toJstString(createdAt);

  var shippingName = "";
  var shippingPostal = "";
  var shippingAddress = "";
  var shippingPhone = "";
  var email = "";

  try {
    if (order) {
      if (order.buyer_email_address) email = order.buyer_email_address;

      if (order.fulfillments && order.fulfillments.length > 0) {
        var f = order.fulfillments[0];
        var sd = f.shipment_details;
        if (sd && sd.recipient) {
          var r = sd.recipient;
          if (r.display_name) shippingName = r.display_name;
          if (r.phone_number) shippingPhone = r.phone_number;

          if (r.address) {
            var addr = r.address;
            if (addr.postal_code) shippingPostal = addr.postal_code;
            var parts = [];
            if (addr.administrative_district_level_1) parts.push(addr.administrative_district_level_1);
            if (addr.locality) parts.push(addr.locality);
            if (addr.address_line_1) parts.push(addr.address_line_1);
            if (addr.address_line_2) parts.push(addr.address_line_2);
            shippingAddress = parts.join("");
          }
        }
      }
    }
  } catch (e) {}

  // email/phone 補完
  if (payment) {
    if (payment.buyer_email_address) email = String(payment.buyer_email_address).trim();
    if (!email && payment.receipt_email) email = String(payment.receipt_email).trim();
  }

  try {
    var cid = payment && payment.customer_id ? String(payment.customer_id) : "";
    if (cid) {
      var c = _fetchCustomer(cid);
      if (c && c.customer) {
        if (!email && c.customer.email_address) email = String(c.customer.email_address).trim();
        if (!shippingPhone && c.customer.phone_number) shippingPhone = String(c.customer.phone_number).trim();
      }
    }
  } catch (e) {}

  try {
    if (order && order.fulfillments && order.fulfillments.length > 0) {
      var sd2 = order.fulfillments[0].shipment_details;
      var rec2 = sd2 && sd2.recipient;
      if (rec2 && rec2.email_address && !email) email = String(rec2.email_address).trim();
      if (rec2 && rec2.phone_number && !shippingPhone) shippingPhone = String(rec2.phone_number).trim();
    }
  } catch (e) {}

  shippingPhone = normalizeJapanesePhone_(shippingPhone);

  var itemsText = "";
  try {
    if (order && order.line_items && order.line_items.length > 0) {
      var items = order.line_items.map(function (li) {
        var name = li.name || "";
        var qty = li.quantity || "1";
        return name + " x " + qty;
      });
      itemsText = items.join(" / ");
    }
  } catch (e) {}

  var billingName = "";
  try {
    if (payment && payment.billing_address) {
      var ba = payment.billing_address;
      var bnParts = [];
      if (ba.first_name) bnParts.push(ba.first_name);
      if (ba.last_name) bnParts.push(ba.last_name);
      billingName = bnParts.join(" ");
    }
    if (!billingName && payment && payment.card_details && payment.card_details.card) {
      var card = payment.card_details.card;
      if (card.cardholder_name) billingName = card.cardholder_name;
    }
  } catch (e) {}

  upsertCompletedPaymentRow_(sheet, paymentId, {
    order_datetime: orderDateTime,
    ship_name: shippingName,
    postal: shippingPostal,
    address: shippingAddress,
    email: email,
    phone: shippingPhone,
    items: itemsText,
    amount: amountText,
    billing_name: billingName,
    product_code: productCode,
    patient_id: patientId,
    order_id: (payment && payment.order_id) ? payment.order_id : orderId,
    payment_status: "COMPLETED",
  });
}
function appendSquareLatestByApi() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("SHEET_ID");
  var sheetName = props.getProperty("SHEET_NAME") || "Square Webhook";
  if (!sheetId) throw new Error("no SHEET_ID");

  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  ensureWebhookHeader_(sheet);

  // order_datetime の最終値を拾う（無ければ全期間扱い）
  var map = headerMap_(sheet);
  var colDt = map["order_datetime"];
  if (!colDt) throw new Error("order_datetime column not found");

  var lastRow = sheet.getLastRow();
  var startJst = null;

  if (lastRow >= 2) {
    // 最終行の order_datetime（文字列でもDateでもOKにする）
    var v = sheet.getRange(lastRow, colDt).getValue();
    var d = (v instanceof Date) ? v : new Date(String(v || ""));
    if (!isNaN(d.getTime())) {
      // 取りこぼし防止で 10分戻す（Webhook停止直前/遅延分を拾う）
      startJst = new Date(d.getTime() - 10 * 60 * 1000);
    }
  }

  var endJst = new Date();

  var beginIso = startJst ? _toUtcIsoFromJstDate_(startJst) : "";
  var endIso = _toUtcIsoFromJstDate_(endJst);

  var cursor = "";
  var processed = 0;

  // GAS 6分制限対策：1回あたり最大80件くらい
  var HARD_LIMIT = 80;

  while (processed < HARD_LIMIT) {
    var resp = _listPayments_(beginIso, endIso, cursor);
    var list = resp.payments || [];

    for (var i = 0; i < list.length && processed < HARD_LIMIT; i++) {
      _upsertFromPayment_(sheet, list[i]);
      processed++;
    }

    cursor = resp.cursor || "";
    if (!cursor) break;

    Utilities.sleep(150);
  }

  // 軽く整形（必要なら）
  if (sheet.getLastRow() >= 2) {
    // order_datetime が文字列の場合に備え、列全体のフォーマットは任意
  }

  SpreadsheetApp.getUi().alert(
    "API追記完了: " +
    (startJst ? Utilities.formatDate(startJst, "Asia/Tokyo", "MM/dd HH:mm") : "（全期間）") +
    " 〜 " +
    Utilities.formatDate(endJst, "Asia/Tokyo", "MM/dd HH:mm") +
    "\n処理件数（最大80/回）: " + processed
  );
}

function normalizeNameForDup_(v) {
  let s = (v ?? "").toString().trim();
  if (!s) return "";

  // 全角英数→半角
  s = s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c =>
    String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
  );

  // 全角・半角スペース除去
  s = s.replace(/[\s　]+/g, "");

  return s;
}

function highlightDuplicateNamesInDailySheet_(sheet) {
  const NAME_COL = 3; // 当日発送シートの "Name" 列（outHeader上で3列目）

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return; // ヘッダー＋1行しかないなら重複し得ない

  // Name列を取得（2行目〜）
  const nameRange = sheet.getRange(2, NAME_COL, lastRow - 1, 1);
  const names = nameRange.getValues().map(r => String(r[0] || ""));

  // 正規化してカウント
  const counts = {};
  const keys = names.map(n => normalizeNameForDup_(n));
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!k) continue;
    counts[k] = (counts[k] || 0) + 1;
  }

  // 背景色：重複は色付け、単独は白に戻す（運用上わかりやすい）
  const bg = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const isDup = k && counts[k] >= 2;

    // 好みで変更可（薄い色）
    bg.push([isDup ? "#FFF2CC" : "#FFFFFF"]);
  }

  nameRange.setBackgrounds(bg);
}
function runAll_fromWebhookSelection() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const webhookSheet = ss.getSheetByName(SHEET_NAME_WEBHOOK);
  const masterSheet  = ss.getSheetByName(SHEET_NAME_MASTER);

  if (!webhookSheet || !masterSheet) {
    SpreadsheetApp.getUi().alert("必要シートが見つかりません（Square Webhook / のなめマスター）。");
    return;
  }

  const range = webhookSheet.getActiveRange();
  if (!range) {
    SpreadsheetApp.getUi().alert("Square Webhook シートで転記したい行を選択してください。");
    return;
  }

  // ① Webhook → のなめマスターへ転記（選択行）
  // ※ 既に実装済み copySelectedToNonameMaster() を流用したいが、
  //    それだと「どの行を追記したか」が取れないため、ここで追記範囲を確定して呼ぶ。
  const beforeLast = masterSheet.getLastRow();

  // 既存の転記関数をそのまま使う（あなたが直した“refund/failedスキップ”込み）
  // 起点がWebhook選択行であることを期待
  ss.setActiveSheet(webhookSheet);
  webhookSheet.setActiveRange(range);
  copySelectedToNonameMaster();

  const afterLast = masterSheet.getLastRow();
  const appendedCount = Math.max(0, afterLast - beforeLast);

  if (appendedCount <= 0) {
    SpreadsheetApp.getUi().alert("転記対象が無かったため、一括処理を終了しました。");
    return;
  }

  // ② のなめマスター：追記した範囲を取得
  const startRow = beforeLast + 1;
  const appendedRange = masterSheet.getRange(startRow, 1, appendedCount, masterSheet.getLastColumn());

  // ③ UID補完（現状の関数はマスター全体の空欄を補完する仕様）
  //    追記分だけに絞る高速版も作れるが、まずは安全に既存関数を使用
  ss.setActiveSheet(masterSheet);
  masterSheet.setActiveRange(appendedRange);
  syncUserIdFromIntakeToMaster();

  // ④ 発送リストへ転記（追記した行だけを対象にする）
  masterSheet.setActiveRange(appendedRange);
  copySelectedToDailyShippingList();

  SpreadsheetApp.getUi().alert(
    `一括完了：\n` +
    `マスター転記：${appendedCount}行（追記範囲 ${startRow}〜${afterLast}）\n` +
    `UID補完：実行済み\n` +
    `発送転記：実行済み`
  );
}

function buildPidWebhookIndexOnce() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Square Webhook");
  if (!sheet) throw new Error("Square Webhook sheet not found");

  const map = headerMap_(sheet);
  const colPid = map["patientId"] || map["patient_id"] || 0;
  if (!colPid) throw new Error("patientId column not found");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const pids = sheet.getRange(2, colPid, lastRow - 1, 1).getValues();

  const grouped = {};
  for (let i = 0; i < pids.length; i++) {
    const pid = String(pids[i][0] || "").trim();
    if (!pid) continue;
    const rowNum = i + 2;
    (grouped[pid] = grouped[pid] || []).push(rowNum);
  }

  // indexシートへ反映（直近N件だけ）
  const idx = getPidWebhookIndexSheet_();
const idxLast = idx.getLastRow();
if (idxLast >= 2) {
  idx.getRange(2, 1, idxLast - 1, 3).clearContent();
}

  const rowsOut = [];
  Object.keys(grouped).forEach(pid => {
    const list = grouped[pid].sort((a,b)=>b-a).slice(0, PID_WEBHOOK_KEEP_N);
    rowsOut.push([pid, list.join(","), nowJst_()]);
  });

  if (rowsOut.length > 0) {
    idx.getRange(2, 1, rowsOut.length, 3).setValues(rowsOut);
  }
}

const PID_WEBHOOK_INDEX_SHEET = "pid_webhook_index";
const PID_WEBHOOK_KEEP_N = 30;

function getPidWebhookIndexSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(PID_WEBHOOK_INDEX_SHEET);
  if (!sh) {
    sh = ss.insertSheet(PID_WEBHOOK_INDEX_SHEET);
    sh.getRange(1, 1, 1, 3).setValues([["patient_id", "rows", "updated_at"]]);
  }
  return sh;
}

function nowJst_() {
  return Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
}

function pidWebhookIndexAddRow_(patientId, rowNumber) {
  const pid = String(patientId || "").trim();
  const row = Number(rowNumber);
  if (!pid || !Number.isFinite(row) || row < 2) return;

  const sh = getPidWebhookIndexSheet_();
  const last = sh.getLastRow();
  const vals = last >= 2 ? sh.getRange(2, 1, last - 1, 2).getValues() : [];

  let hit = 0;
  let existing = "";
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0] || "").trim() === pid) {
      hit = i + 2;
      existing = String(vals[i][1] || "");
      break;
    }
  }

  const list = existing
    ? existing.split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n))
    : [];

  list.unshift(row);

  const seen = {};
  const uniq = [];
  list.sort((a,b)=>b-a);
  for (let i = 0; i < list.length; i++) {
    const k = String(list[i]);
    if (seen[k]) continue;
    seen[k] = true;
    uniq.push(list[i]);
    if (uniq.length >= PID_WEBHOOK_KEEP_N) break;
  }

  const outCsv = uniq.join(",");
  const ts = nowJst_();

  if (!hit) sh.appendRow([pid, outCsv, ts]);
  else {
    sh.getRange(hit, 2).setValue(outCsv);
    sh.getRange(hit, 3).setValue(ts);
  }
    // ★追加：問診ブックにミラー更新
  try { mirrorPidIndexToMypage_(pid, outCsv); } catch (e) {}
}
function mirrorPidIndexToMypage_(patientId, rowsCsv) {
  const pid = String(patientId || "").trim();
  const csv = String(rowsCsv || "").trim();
  if (!pid) return;

  const props = PropertiesService.getScriptProperties();
  const mypageId = props.getProperty("MYPAGE_SHEET_ID");
  const sheetName = props.getProperty("MYPAGE_INDEX_SHEET_NAME") || "pid_webhook_index_mirror";
  if (!mypageId) return;

  const ss = SpreadsheetApp.openById(mypageId);
  let sh = ss.getSheetByName(sheetName);
  if (!sh) {
    sh = ss.insertSheet(sheetName);
    sh.getRange(1, 1, 1, 3).setValues([["patient_id", "rows", "updated_at"]]);
  }

  const last = sh.getLastRow();
  if (last >= 2) {
    const rng = sh.getRange(2, 1, last - 1, 1);
    const cell = rng.createTextFinder(pid).matchEntireCell(true).findNext();
    if (cell) {
      const r = cell.getRow();
      sh.getRange(r, 2).setValue(csv);
      sh.getRange(r, 3).setValue(nowJst_());
      return;
    }
  }

  sh.appendRow([pid, csv, nowJst_()]);
}

const PAY_MASTER_INDEX_SHEET = "pay_master_index";
const NONAME_MASTER_SHEET = "のなめマスター"; // 実名に合わせて

function ensurePayMasterIndexSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(PAY_MASTER_INDEX_SHEET);
  if (!sh) {
    sh = ss.insertSheet(PAY_MASTER_INDEX_SHEET);
    sh.getRange(1, 1, 1, 3).setValues([["payment_id", "row", "updated_at"]]);
  } else {
    const h = sh.getRange(1, 1, 1, 3).getValues()[0];
    if (String(h[0] || "") !== "payment_id") {
      sh.getRange(1, 1, 1, 3).setValues([["payment_id", "row", "updated_at"]]);
    }
  }
  return sh;
}

function nowJst_() {
  return Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
}

function buildPayMasterIndexOnce() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ms = ss.getSheetByName(NONAME_MASTER_SHEET);
  if (!ms) throw new Error("のなめマスターが見つかりません: " + NONAME_MASTER_SHEET);

  const idx = ensurePayMasterIndexSheet_();

  // 既存クリア（ヘッダー以外）
  const idxLast = idx.getLastRow();
  if (idxLast >= 2) idx.getRange(2, 1, idxLast - 1, 3).clearContent();

  const lastRow = ms.getLastRow();
  if (lastRow < 2) return;

  const COL_PAY = 17; // Q列 payment_id（あなたの定義）
  const pays = ms.getRange(2, COL_PAY, lastRow - 1, 1).getDisplayValues();

  // payment_id -> row（後勝ち：下の行を優先）
  const map = {};
  for (let i = 0; i < pays.length; i++) {
    const pay = String(pays[i][0] || "").trim();
    if (!pay) continue;
    map[pay] = i + 2;
  }

  const ts = nowJst_();
  const out = Object.keys(map).map(pay => [pay, map[pay], ts]);

  if (out.length > 0) {
    idx.getRange(2, 1, out.length, 3).setValues(out);
  }

  Logger.log("buildPayMasterIndexOnce done: " + out.length);
}

// ★ Vercel キャッシュ無効化API呼び出し
function invalidateMypageCache_(patientId) {
  if (!patientId) {
    Logger.log("[invalidateMypageCache_] No patient_id provided");
    return;
  }

  var props = PropertiesService.getScriptProperties();
  var vercelUrl = props.getProperty("VERCEL_URL");
  var adminToken = props.getProperty("ADMIN_TOKEN");

  if (!vercelUrl || !adminToken) {
    Logger.log("[invalidateMypageCache_] Missing VERCEL_URL or ADMIN_TOKEN");
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

    Logger.log("[invalidateMypageCache_] pid=" + patientId + " code=" + code + " body=" + body);

    if (code >= 200 && code < 300) {
      Logger.log("[invalidateMypageCache_] Success for patient_id=" + patientId);
    } else {
      Logger.log("[invalidateMypageCache_] Failed for patient_id=" + patientId + " code=" + code);
    }
  } catch (e) {
    Logger.log("[invalidateMypageCache_] Error for patient_id=" + patientId + ": " + e);
  }
}
function getPidWebhookIndexSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(PID_WEBHOOK_INDEX_SHEET);
  if (!sh) {
    sh = ss.insertSheet(PID_WEBHOOK_INDEX_SHEET);
    sh.getRange(1, 1, 1, 3).setValues([["patient_id", "rows", "updated_at"]]);
  } else {
    // ヘッダーが壊れてたら直す（任意）
    const h = sh.getRange(1, 1, 1, 3).getValues()[0];
    if (String(h[0] || "").trim() !== "patient_id") {
      sh.getRange(1, 1, 1, 3).setValues([["patient_id", "rows", "updated_at"]]);
    }
  }

  // ★超重要：rows列(B列)を「プレーンテキスト」に固定
  sh.getRange("B:B").setNumberFormat("@");

  return sh;
}
function mirrorPidIndexToMypage_(patientId, rowsCsv) {
  const pid = String(patientId || "").trim();
  const csv = String(rowsCsv || "").trim();
  if (!pid) return;

  const props = PropertiesService.getScriptProperties();
  const mypageId = props.getProperty("MYPAGE_SHEET_ID");
  const sheetName = props.getProperty("MYPAGE_INDEX_SHEET_NAME") || "pid_webhook_index_mirror";
  if (!mypageId) return;

  const ss = SpreadsheetApp.openById(mypageId);
  let sh = ss.getSheetByName(sheetName);
  if (!sh) {
    sh = ss.insertSheet(sheetName);
    sh.getRange(1, 1, 1, 3).setValues([["patient_id", "rows", "updated_at"]]);
  }

  // ★重要：ミラーも rows 列をプレーンテキストに固定
  sh.getRange("B:B").setNumberFormat("@");

  // （以下は今のままでOK）
  const last = sh.getLastRow();
  if (last >= 2) {
    const rng = sh.getRange(2, 1, last - 1, 1);
    const cell = rng.createTextFinder(pid).matchEntireCell(true).findNext();
    if (cell) {
      const r = cell.getRow();
      sh.getRange(r, 2).setValue(csv);
      sh.getRange(r, 3).setValue(nowJst_());
      return;
    }
  }

  sh.appendRow([pid, csv, nowJst_()]);
}


// ================================
// Square Webhook → Supabase 同期
// ================================

function normPid_(v) {
  if (v === null || v === undefined) return "";
  var s = String(v).trim();
  if (s.endsWith(".0")) s = s.slice(0, -2);
  s = s.replace(/\s+/g, "");
  return s;
}

function syncWebhookSinglePatient_20260101106() {
  const targetPatientId = "20260101106";

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");
  const sheetId = props.getProperty("SHEET_ID");

  if (!supabaseUrl || !supabaseKey || !sheetId) {
    Logger.log("ERROR: Missing required properties");
    return;
  }

  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName(SHEET_NAME_WEBHOOK);

  if (!sheet) {
    Logger.log("ERROR: Sheet not found");
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("No data");
    return;
  }

  const allData = sheet.getRange(2, 1, lastRow - 1, 18).getValues();

  let synced = 0;
  let errors = 0;

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const patientId = normPid_(row[11]); // L列

    if (patientId !== targetPatientId) continue;

    const paymentId = normPid_(row[9]); // J列

    if (!paymentId) {
      Logger.log("Row " + (i + 2) + ": No payment_id, skipping");
      continue;
    }

    // order_datetime
    const orderDatetimeRaw = row[0];
    let paidAt = null;
    if (orderDatetimeRaw) {
      try {
        if (orderDatetimeRaw instanceof Date) {
          paidAt = orderDatetimeRaw.toISOString();
        } else {
          const str = String(orderDatetimeRaw).trim();
          const match = str.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
          if (match) {
            const [, y, m, d, hh, mm, ss] = match;
            const jstDate = new Date(y + "-" + m + "-" + d + "T" + hh + ":" + mm + ":" + ss + "+09:00");
            paidAt = jstDate.toISOString();
          } else {
            paidAt = new Date(orderDatetimeRaw).toISOString();
          }
        }
      } catch (e) {
        Logger.log("Failed to parse order_datetime: " + e);
      }
    }

    // refunded_at
    const refundedAtRaw = row[16];
    let refundedAt = null;
    if (refundedAtRaw) {
      try {
        if (refundedAtRaw instanceof Date) {
          refundedAt = refundedAtRaw.toISOString();
        } else {
          const str = String(refundedAtRaw).trim();
          const match = str.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
          if (match) {
            const [, y, m, d, hh, mm, ss] = match;
            const jstDate = new Date(y + "-" + m + "-" + d + "T" + hh + ":" + mm + ":" + ss + "+09:00");
            refundedAt = jstDate.toISOString();
          } else {
            refundedAt = new Date(refundedAtRaw).toISOString();
          }
        }
      } catch (e) {
        Logger.log("Failed to parse refunded_at: " + e);
      }
    }

    const updateData = {
      id: paymentId,
      patient_id: patientId || null,
      product_code: (row[10] || "").toString().trim() || null,
      product_name: (row[6] || "").toString().trim() || null,
      amount: parseFloat(row[7]) || 0,
      paid_at: paidAt,
      shipping_status: "pending",
      payment_status: (row[13] || "").toString().trim() || "COMPLETED",
      refund_status: (row[14] || "").toString().trim() || null,
      refunded_at: refundedAt,
      refunded_amount: parseFloat(row[15]) || null
    };

    Logger.log("=== Syncing Row " + (i + 2) + " ===");
    Logger.log("Payment ID: " + paymentId);
    Logger.log("Product: " + updateData.product_name);
    Logger.log("Amount: " + updateData.amount);

    const endpoint = supabaseUrl + "/rest/v1/orders";

    try {
      const res = UrlFetchApp.fetch(endpoint, {
        method: "post",
        contentType: "application/json",
        headers: {
          "apikey": supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Prefer": "resolution=merge-duplicates"
        },
        payload: JSON.stringify(updateData),
        muteHttpExceptions: true,
        timeout: 10
      });

      const code = res.getResponseCode();
      if (code >= 200 && code < 300) {
        synced++;
        Logger.log("✓ Synced successfully");
      } else {
        errors++;
        const responseText = res.getContentText();
        Logger.log("✗ Failed with code " + code);
        Logger.log("Response: " + responseText);
      }
    } catch (e) {
      errors++;
      Logger.log("✗ Error: " + e);
    }
  }

  Logger.log("\n=== COMPLETE ===");
  Logger.log("Synced: " + synced);
  Logger.log("Errors: " + errors);

  if (synced === 0 && errors === 0) {
    Logger.log("❌ No data found for patient_id=" + targetPatientId);
  }
}

// 全件同期（バッチ実行）
function syncWebhookToSupabaseAll() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");
  const sheetId = props.getProperty("SHEET_ID");

  if (!supabaseUrl || !supabaseKey || !sheetId) {
    Logger.log("ERROR: Missing required properties");
    return;
  }

  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName(SHEET_NAME_WEBHOOK);

  if (!sheet) {
    Logger.log("ERROR: Sheet not found");
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("No data");
    return;
  }

  const totalRows = lastRow - 1;
  Logger.log("=== Sync Webhook → Supabase (ALL) ===");
  Logger.log("Total rows: " + totalRows);
  Logger.log("");

  const allData = sheet.getRange(2, 1, totalRows, 18).getValues();

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const paymentId = normPid_(row[9]); // J列
    const patientId = normPid_(row[11]); // L列

    if (!paymentId) {
      skipped++;
      continue;
    }

    // patient_id必須（Supabase NOT NULL制約）
    if (!patientId) {
      skipped++;
      continue;
    }

    // order_datetime
    const orderDatetimeRaw = row[0];
    let paidAt = null;
    if (orderDatetimeRaw) {
      try {
        if (orderDatetimeRaw instanceof Date) {
          paidAt = orderDatetimeRaw.toISOString();
        } else {
          const str = String(orderDatetimeRaw).trim();
          const match = str.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
          if (match) {
            const [, y, m, d, hh, mm, ss] = match;
            const jstDate = new Date(y + "-" + m + "-" + d + "T" + hh + ":" + mm + ":" + ss + "+09:00");
            paidAt = jstDate.toISOString();
          } else {
            paidAt = new Date(orderDatetimeRaw).toISOString();
          }
        }
      } catch (e) {
        // skip
      }
    }

    // refunded_at
    const refundedAtRaw = row[16];
    let refundedAt = null;
    if (refundedAtRaw) {
      try {
        if (refundedAtRaw instanceof Date) {
          refundedAt = refundedAtRaw.toISOString();
        } else {
          const str = String(refundedAtRaw).trim();
          const match = str.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
          if (match) {
            const [, y, m, d, hh, mm, ss] = match;
            const jstDate = new Date(y + "-" + m + "-" + d + "T" + hh + ":" + mm + ":" + ss + "+09:00");
            refundedAt = jstDate.toISOString();
          } else {
            refundedAt = new Date(refundedAtRaw).toISOString();
          }
        }
      } catch (e) {
        // skip
      }
    }

    const updateData = {
      id: paymentId,
      patient_id: patientId || null,
      product_code: (row[10] || "").toString().trim() || null,
      product_name: (row[6] || "").toString().trim() || null,
      amount: parseFloat(row[7]) || 0,
      paid_at: paidAt,
      shipping_status: "pending",
      payment_status: (row[13] || "").toString().trim() || "COMPLETED",
      refund_status: (row[14] || "").toString().trim() || null,
      refunded_at: refundedAt,
      refunded_amount: parseFloat(row[15]) || null
    };

    const endpoint = supabaseUrl + "/rest/v1/orders";

    try {
      const res = UrlFetchApp.fetch(endpoint, {
        method: "post",
        contentType: "application/json",
        headers: {
          "apikey": supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Prefer": "resolution=merge-duplicates"
        },
        payload: JSON.stringify(updateData),
        muteHttpExceptions: true,
        timeout: 10
      });

      const code = res.getResponseCode();
      if (code >= 200 && code < 300) {
        synced++;
        if ((synced % 50) === 0) {
          Logger.log("[Progress] Synced: " + synced + "/" + totalRows);
        }
      } else {
        errors++;
        if (errors <= 5) {
          Logger.log("✗ payment_id=" + paymentId + " code=" + code);
        }
      }
    } catch (e) {
      errors++;
      if (errors <= 5) {
        Logger.log("✗ payment_id=" + paymentId + " error=" + e);
      }
    }

    Utilities.sleep(50);
  }

  Logger.log("");
  Logger.log("=== COMPLETE ===");
  Logger.log("Synced: " + synced);
  Logger.log("Skipped: " + skipped);
  Logger.log("Errors: " + errors);
}

// バッチ同期（100件ずつ）
function syncWebhookBatch(offset, limit) {
  offset = offset || 0;
  limit = limit || 100;

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");
  const sheetId = props.getProperty("SHEET_ID");

  if (!supabaseUrl || !supabaseKey || !sheetId) {
    Logger.log("ERROR: Missing required properties");
    return;
  }

  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName(SHEET_NAME_WEBHOOK);

  if (!sheet) {
    Logger.log("ERROR: Sheet not found");
    return;
  }

  const lastRow = sheet.getLastRow();
  const totalRows = lastRow - 1;
  const startRow = offset + 2;
  const actualBatchSize = Math.min(limit, totalRows - offset);

  if (actualBatchSize <= 0) {
    Logger.log("No rows to process at offset=" + offset);
    return;
  }

  Logger.log("=== Sync Webhook Batch ===");
  Logger.log("Total rows: " + totalRows);
  Logger.log("Processing: " + startRow + " to " + (startRow + actualBatchSize - 1));
  Logger.log("");

  const allData = sheet.getRange(startRow, 1, actualBatchSize, 18).getValues();

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const paymentId = normPid_(row[9]);
    const patientId = normPid_(row[11]);

    if (!paymentId) {
      skipped++;
      continue;
    }

    // patient_id必須（Supabase NOT NULL制約）
    if (!patientId) {
      skipped++;
      continue;
    }

    const orderDatetimeRaw = row[0];
    let paidAt = null;
    if (orderDatetimeRaw) {
      try {
        if (orderDatetimeRaw instanceof Date) {
          paidAt = orderDatetimeRaw.toISOString();
        } else {
          const str = String(orderDatetimeRaw).trim();
          const match = str.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
          if (match) {
            const [, y, m, d, hh, mm, ss] = match;
            const jstDate = new Date(y + "-" + m + "-" + d + "T" + hh + ":" + mm + ":" + ss + "+09:00");
            paidAt = jstDate.toISOString();
          } else {
            paidAt = new Date(orderDatetimeRaw).toISOString();
          }
        }
      } catch (e) {}
    }

    const refundedAtRaw = row[16];
    let refundedAt = null;
    if (refundedAtRaw) {
      try {
        if (refundedAtRaw instanceof Date) {
          refundedAt = refundedAtRaw.toISOString();
        } else {
          const str = String(refundedAtRaw).trim();
          const match = str.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
          if (match) {
            const [, y, m, d, hh, mm, ss] = match;
            const jstDate = new Date(y + "-" + m + "-" + d + "T" + hh + ":" + mm + ":" + ss + "+09:00");
            refundedAt = jstDate.toISOString();
          } else {
            refundedAt = new Date(refundedAtRaw).toISOString();
          }
        }
      } catch (e) {}
    }

    const amount = parseFloat(row[7]);
    const refundedAmount = parseFloat(row[15]);

    const updateData = {
      id: paymentId,
      patient_id: patientId || null,
      product_code: (row[10] || "").toString().trim() || null,
      product_name: (row[6] || "").toString().trim() || null,
      amount: isNaN(amount) ? 0 : amount,
      paid_at: paidAt,
      shipping_status: "pending",
      payment_status: (row[13] || "").toString().trim() || "COMPLETED",
      refund_status: (row[14] || "").toString().trim() || null,
      refunded_at: refundedAt,
      refunded_amount: isNaN(refundedAmount) ? null : refundedAmount
    };

    const endpoint = supabaseUrl + "/rest/v1/orders";

    try {
      const res = UrlFetchApp.fetch(endpoint, {
        method: "post",
        contentType: "application/json",
        headers: {
          "apikey": supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Prefer": "resolution=merge-duplicates"
        },
        payload: JSON.stringify(updateData),
        muteHttpExceptions: true,
        timeout: 10
      });

      const code = res.getResponseCode();
      if (code >= 200 && code < 300) {
        synced++;
      } else {
        errors++;
        if (errors <= 3) {
          Logger.log("✗ Row " + (startRow + i) + " payment_id=" + paymentId + " code=" + code);
          Logger.log("  Response: " + res.getContentText());
          Logger.log("  Data: " + JSON.stringify(updateData));
        }
      }
    } catch (e) {
      errors++;
      if (errors <= 3) {
        Logger.log("✗ Row " + (startRow + i) + " payment_id=" + paymentId + " error=" + e);
      }
    }

    Utilities.sleep(10); // 50ms → 10msに短縮
  }

  Logger.log("");
  Logger.log("=== Batch Complete ===");
  Logger.log("Synced: " + synced);
  Logger.log("Skipped: " + skipped);
  Logger.log("Errors: " + errors);
}

// バッチ実行用（500件ずつ）
function syncWebhookBatch500_1() { syncWebhookBatch(0, 500); }
function syncWebhookBatch500_2() { syncWebhookBatch(500, 500); }
function syncWebhookBatch500_3() { syncWebhookBatch(1000, 500); }
function syncWebhookBatch500_4() { syncWebhookBatch(1500, 500); }
function syncWebhookBatch500_5() { syncWebhookBatch(2000, 500); }

// ========================================
