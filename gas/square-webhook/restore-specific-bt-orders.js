// 削除された特定のbt_*レコードをのなめマスターから復元
function restoreSpecificBtOrders() {
  const targetPaymentIds = [
    'bt_42', 'bt_41', 'bt_40', 'bt_39', 'bt_38', 'bt_37', 'bt_36', 'bt_35',
    'bt_34', 'bt_33', 'bt_32', 'bt_31', 'bt_30', 'bt_29', 'bt_28', 'bt_21',
    'bt_18', 'bt_14', 'bt_10', 'bt_9', 'bt_8'
  ];

  Logger.log("=== Restore " + targetPaymentIds.length + " bt_* orders ===");

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

  // 全データを読み取り
  const allData = sheet.getRange(2, 1, lastRow - 1, 35).getValues();
  const COL_PAYMENT_ID = 16; // Q列（0-indexed: 16）

  let updated = 0;
  let errors = 0;

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const paymentId = String(row[COL_PAYMENT_ID] || "").trim();

    // 対象のpayment_idのみ処理
    if (!targetPaymentIds.includes(paymentId)) {
      continue;
    }

    // データを構築
    const orderDatetimeRaw = row[1]; // B列: 決済日時
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

    // shipping_date（U列 = 20）
    const shippingDateRaw = row[20];
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
    const trackingNumber = (row[21] || "").toString().trim();

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
      patient_id: (row[15] || "").toString().trim(),                     // P列
      product_code: (row[17] || "").toString().trim(),                   // R列
      product_name: (row[7] || "").toString().trim(),                    // H列
      amount: parseFloat(row[8]) || 0,                                   // I列
      paid_at: paidAt,
      shipping_status: (row[19] || "").toString().trim() || "pending",   // T列
      shipping_date: shippingDate,
      tracking_number: trackingNumber || null,
      carrier: carrier,
      payment_status: (row[22] || "").toString().trim() || "COMPLETED",  // W列
      payment_method: "bank_transfer",
      refund_status: (row[23] || "").toString().trim() || null,          // X列
      refunded_at: null,
      refunded_amount: parseFloat(row[24]) || null,                      // Y列
    };

    // Supabaseに送信
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

  const message = "復元完了\n\n成功: " + updated + "件\nエラー: " + errors + "件";
  SpreadsheetApp.getUi().alert(message);
  Logger.log("=== Restore Complete ===");
  Logger.log("Success: " + updated + ", Errors: " + errors);
}
