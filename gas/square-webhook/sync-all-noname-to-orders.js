// のなめマスターシート全体をordersテーブルに同期（追跡番号含む）
function syncAllNonameMasterToOrders() {
  Logger.log("=== Sync All Noname Master to Orders ===");

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    SpreadsheetApp.getUi().alert("Supabase接続情報が設定されていません");
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("のなめマスター");

  if (!sheet) {
    Logger.log("ERROR: のなめマスター sheet not found");
    SpreadsheetApp.getUi().alert("のなめマスターシートが見つかりません");
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("No data");
    return;
  }

  // 全データを読み取り（35列まで）
  const allData = sheet.getRange(2, 1, lastRow - 1, 35).getValues();

  // 列インデックス（0-indexed）
  const COL_ORDER_DATETIME = 0;   // A列: 注文日時
  const COL_PRODUCT_NAME = 7;     // H列: 商品名
  const COL_AMOUNT = 8;           // I列: 金額
  const COL_PATIENT_ID = 15;      // P列: patient_id
  const COL_PAYMENT_ID = 16;      // Q列: payment_id (bt_9など)
  const COL_PRODUCT_CODE = 17;    // R列: product_code
  const COL_SHIPPING_STATUS = 19; // T列: shipping_status
  const COL_SHIPPING_DATE = 20;   // U列: shipping_date
  const COL_TRACKING_NUMBER = 21; // V列: tracking_number
  const COL_PAYMENT_STATUS = 22;  // W列: payment_status
  const COL_REFUND_STATUS = 23;   // X列: refund_status
  const COL_REFUNDED_AMOUNT = 24; // Y列: refunded_amount

  let updated = 0;
  let errors = 0;

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const paymentId = String(row[COL_PAYMENT_ID] || "").trim();
    const patientId = String(row[COL_PATIENT_ID] || "").trim();

    // payment_idがない、またはbt_で始まらない場合はスキップ
    if (!paymentId || !paymentId.startsWith("bt_")) {
      continue;
    }

    // patient_idがない場合もスキップ
    if (!patientId) {
      Logger.log("Skip: " + paymentId + " (no patient_id)");
      continue;
    }

    // order_datetime（A列）をISO形式に変換
    const orderDatetimeRaw = row[COL_ORDER_DATETIME];
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
        Logger.log("Failed to parse order_datetime for " + paymentId + ": " + e);
      }
    }

    // shipping_date（U列 = 20）を YYYY-MM-DD 形式に変換
    const shippingDateRaw = row[COL_SHIPPING_DATE];
    let shippingDate = null;
    if (shippingDateRaw) {
      try {
        if (shippingDateRaw instanceof Date) {
          shippingDate = Utilities.formatDate(shippingDateRaw, "Asia/Tokyo", "yyyy-MM-dd");
        } else {
          const str = String(shippingDateRaw).trim();
          const match = str.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
          if (match) {
            shippingDate = match[1] + "-" + match[2] + "-" + match[3];
          }
        }
      } catch (e) {
        Logger.log("Failed to parse shipping_date for " + paymentId + ": " + e);
      }
    }

    // tracking_number（V列 = 21）
    const trackingNumber = (row[COL_TRACKING_NUMBER] || "").toString().trim();

    // carrier判定
    let carrier = null;
    if (trackingNumber) {
      if (trackingNumber.match(/^\d{11,12}$/)) {
        carrier = "japanpost";
      } else if (trackingNumber.match(/^\d{12}$/)) {
        carrier = "yamato";
      }
    }

    const orderData = {
      id: paymentId,
      patient_id: patientId,
      product_code: (row[COL_PRODUCT_CODE] || "").toString().trim() || null,
      product_name: (row[COL_PRODUCT_NAME] || "").toString().trim() || null,
      amount: parseFloat(row[COL_AMOUNT]) || 0,
      paid_at: paidAt,
      shipping_status: (row[COL_SHIPPING_STATUS] || "").toString().trim() || "pending",
      shipping_date: shippingDate,
      tracking_number: trackingNumber || null,
      carrier: carrier,
      payment_status: (row[COL_PAYMENT_STATUS] || "").toString().trim() || "COMPLETED",
      payment_method: "bank_transfer",
      refund_status: (row[COL_REFUND_STATUS] || "").toString().trim() || null,
      refunded_at: null,
      refunded_amount: parseFloat(row[COL_REFUNDED_AMOUNT]) || null,
    };

    // Supabaseに送信（upsert）
    const url = supabaseUrl + "/rest/v1/orders";
    const response = UrlFetchApp.fetch(url, {
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

    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      updated++;
      Logger.log("✅ " + paymentId + " (row " + (i + 2) + ")");
    } else {
      errors++;
      Logger.log("❌ " + paymentId + " HTTP " + code + ": " + response.getContentText());
    }
  }

  const message = "同期完了\n\n成功: " + updated + "件\nエラー: " + errors + "件";
  SpreadsheetApp.getUi().alert(message);
  Logger.log("=== Sync Complete ===");
  Logger.log("Success: " + updated + ", Errors: " + errors);
}
