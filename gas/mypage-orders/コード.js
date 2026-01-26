/**
 * MyPage 用：患者ごとの注文情報を返す API
 *
 * Request (JSON, POST):
 *   { "patient_id": "20251200006" }
 *
 * Script Properties:
 *  - SHEET_ID_WEBHOOK   : Square WebhookシートのスプレッドシートID
 *  - SHEET_NAME_WEBHOOK : シート名（例: "Square Webhook"）
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _jsonResponse({ ok: false, error: "no body" }, 400);
    }

    var body = JSON.parse(e.postData.contents);
    var patientId = body.patient_id;
    if (!patientId) {
      return _jsonResponse(
        { ok: false, error: "patient_id is required" },
        400
      );
    }
    patientId = String(patientId).trim();

    var props = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty("SHEET_ID_WEBHOOK");
    var sheetName =
      props.getProperty("SHEET_NAME_WEBHOOK") || "Square Webhook";

    if (!sheetId) {
      return _jsonResponse(
        { ok: false, error: "SHEET_ID_WEBHOOK is not set" },
        500
      );
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return _jsonResponse(
        { ok: false, error: "sheet not found: " + sheetName },
        500
      );
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return _jsonResponse(
        {
          ok: true,
          orders: [],
          flags: {
            canPurchaseCurrentCourse: true, // まだ決済なしなので初回購入OK
            canApplyReorder: false,
            hasAnyPaidOrder: false,
          },
        },
        200
      );
    }

    var values = sheet
      .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
      .getValues();

    var orders = [];

    // 想定ヘッダー:
    // A:order_datetime, B:name(配送先), C:postal, D:address, E:email, F:phone,
    // G:items, H:amount, I:name(請求先), J:payment_id, K:product_code, L:patient_id
    for (var i = 0; i < values.length; i++) {
      var row = values[i];

      var rowPatientId = String(row[11] || ""); // L列 patient_id
      if (rowPatientId !== patientId) continue;

      var orderDatetime = row[0]; // A
      var amount = row[7]; // H
      var paymentId = row[9]; // J
      var productCode = String(row[10] || ""); // K
      var itemsText = String(row[6] || ""); // G: items

      // 商品名（items が最優先）
      var productName = itemsText || productCode || "マンジャロ";

      // 支払い日時（表示用）
      var paidAtJst = "";
      if (orderDatetime instanceof Date) {
        paidAtJst = _formatDateTimeJst(orderDatetime);
      } else if (typeof orderDatetime === "string") {
        paidAtJst = orderDatetime;
      }

      // 発送予定日: 12:00 までは当日、それ以降は翌日
      var shippingEta = "";
      var dt = null;

      if (orderDatetime instanceof Date) {
        dt = orderDatetime;
      } else if (typeof orderDatetime === "string" && orderDatetime) {
        // "YYYY/MM/DD HH:MM:SS" を想定して Date に変換
        var parts = String(orderDatetime).split(" ");
        if (parts.length >= 2) {
          var datePart = parts[0].split("/");
          var timePart = parts[1].split(":");
          if (datePart.length === 3 && timePart.length >= 2) {
            dt = new Date(
              Number(datePart[0]),
              Number(datePart[1]) - 1,
              Number(datePart[2]),
              Number(timePart[0]),
              Number(timePart[1])
            );
          }
        }
      }

      if (dt) {
        var cutoff = new Date(dt.getTime());
        cutoff.setHours(12, 0, 0, 0); // 当日12:00

        var shipDate = new Date(dt.getTime());
        if (dt.getTime() > cutoff.getTime()) {
          // 12時を過ぎていたら翌日
          shipDate.setDate(shipDate.getDate() + 1);
        }

        var sy = shipDate.getFullYear();
        var sm = ("0" + (shipDate.getMonth() + 1)).slice(-2);
        var sd = ("0" + shipDate.getDate()).slice(-2);
        shippingEta = sy + "-" + sm + "-" + sd; // "YYYY-MM-DD"
      }

      orders.push({
        id: paymentId || "PAY-" + (i + 2),
        product_code: productCode,
        product_name: productName,
        amount: Number(amount) || 0,
        paid_at_jst: paidAtJst,
        shipping_status: "pending", // 今は常に受付済み
        shipping_eta: shippingEta, // ★ 発送予定日（後で発送リストと突合して書き換え可）
        tracking_number: "", // ★ 追跡番号は別マスターから埋める予定
        payment_status: "paid",
      });
    }

    var hasAnyPaidOrder = orders.length > 0;

    var flags = {
      canPurchaseCurrentCourse: !hasAnyPaidOrder, // 初回購入は1回だけ
      canApplyReorder: hasAnyPaidOrder, // 1回でも決済あれば再処方可
      hasAnyPaidOrder: hasAnyPaidOrder,
    };

    return _jsonResponse(
      {
        ok: true,
        orders: orders,
        flags: flags,
      },
      200
    );
  } catch (err) {
    Logger.log("orders doPost error: " + err);
    return _jsonResponse({ ok: false, error: String(err) }, 500);
  }
}

function _jsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

function _formatDateTimeJst(date) {
  var y = date.getFullYear();
  var m = ("0" + (date.getMonth() + 1)).slice(-2);
  var d = ("0" + date.getDate()).slice(-2);
  var hh = ("0" + date.getHours()).slice(-2);
  var mm = ("0" + date.getMinutes()).slice(-2);
  var ss = ("0" + date.getSeconds()).slice(-2);
  return y + "/" + m + "/" + d + " " + hh + ":" + mm + ":" + ss;
}
