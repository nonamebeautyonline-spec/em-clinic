// のなめマスターシート全件をSupabaseのordersテーブルに同期

const NONAME_MASTER_SHEET_ID = "1FrFXCfwP7BqW5Bp-EP27TzydPoRmHp6Hw2eYAIcXzMI";

function syncAllOrdersToSupabase(offset, batchSize) {
  offset = offset || 0;
  batchSize = batchSize || 100;

  Logger.log("=== syncAllOrdersToSupabase START ===");
  Logger.log("Offset: " + offset + ", Batch size: " + batchSize);

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("[SyncOrders] ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return;
  }

  const ss = SpreadsheetApp.openById(NONAME_MASTER_SHEET_ID);
  const sheet = ss.getSheets()[0]; // 最初のシート

  if (!sheet) {
    Logger.log("[SyncOrders] ERROR: Sheet not found");
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("[SyncOrders] No data to sync");
    return;
  }

  const totalRows = lastRow - 1; // ヘッダー除く
  const startRow = 2 + offset;
  const endRow = Math.min(startRow + batchSize - 1, lastRow);
  const actualBatchSize = endRow - startRow + 1;

  if (offset >= totalRows) {
    Logger.log("[SyncOrders] Offset exceeds total rows. Nothing to process.");
    return;
  }

  Logger.log("[SyncOrders] Total rows: " + totalRows);
  Logger.log("[SyncOrders] Processing rows " + startRow + " to " + endRow + " (" + actualBatchSize + " rows)");

  // 全列を読み取る
  const allData = sheet.getRange(startRow, 1, actualBatchSize, 35).getValues();

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];

    // 列インデックス（0-based）
    // 0: user_id, 1: 決済日時, 2: Name, 3: Postal Code, 4: Address, 5: Email, 6: Phone
    // 7: Product Name, 8: Price, 9-12: 2.5mg/5mg/7.5mg/10mg, 13-14: cash/check
    // 15: patient_id, 16: payment_id, 17: product_code, 18: source
    // 19: shipping_status, 20: shipping_date, 21: tracking_number
    // 22: payment_status, 23: refund_status, 24: refunded_amount, 25: refunded_at
    // 26: refund_id, 27: delivery_date, 28: time_band, 29: hold_flag, 30: hold_code
    // 31: delivery_updated_at, 32: delivery_locked_at, 33: delivery_lock_reason

    const paymentId = (row[16] || "").toString().trim(); // payment_id
    const patientId = (row[15] || "").toString().trim(); // patient_id

    if (!paymentId) {
      skipped++;
      continue;
    }

    // Supabaseに送るデータを構築
    const paidAtRaw = row[1]; // 決済日時
    let paidAt = null;
    if (paidAtRaw) {
      try {
        if (paidAtRaw instanceof Date) {
          paidAt = paidAtRaw.toISOString();
        } else {
          // "2026/01/27 11:37:56" 形式を想定
          const match = String(paidAtRaw).match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
          if (match) {
            const [, y, m, d, hh, mm, ss] = match;
            paidAt = y + "-" + m + "-" + d + "T" + hh + ":" + mm + ":" + ss + "+09:00";
          } else {
            paidAt = new Date(paidAtRaw).toISOString();
          }
        }
      } catch (e) {
        paidAt = String(paidAtRaw);
      }
    }

    const refundedAtRaw = row[25]; // refunded_at
    let refundedAt = null;
    if (refundedAtRaw) {
      try {
        if (refundedAtRaw instanceof Date) {
          refundedAt = refundedAtRaw.toISOString();
        } else {
          refundedAt = new Date(refundedAtRaw).toISOString();
        }
      } catch (e) {
        refundedAt = String(refundedAtRaw);
      }
    }

    // carrier を推測（時間帯から）
    const timeBand = (row[28] || "").toString().trim();
    let carrier = null;
    if (timeBand && timeBand !== "") {
      carrier = "yamato"; // 時間帯指定がある場合はヤマト
    }

    const updateData = {
      id: paymentId,
      patient_id: patientId || null,
      product_code: (row[17] || "").toString().trim() || null,
      product_name: (row[7] || "").toString().trim() || null,
      amount: parseFloat(row[8]) || 0,
      paid_at: paidAt,
      shipping_status: (row[19] || "").toString().trim() || "pending",
      shipping_date: (row[20] || "").toString().trim() || null,
      tracking_number: (row[21] || "").toString().trim() || null,
      carrier: carrier,
      payment_status: (row[22] || "").toString().trim() || "COMPLETED",
      refund_status: (row[23] || "").toString().trim() || null,
      refunded_at: refundedAt,
      refunded_amount: parseFloat(row[24]) || null
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
        updated++;
        if ((updated % 10) === 0) {
          Logger.log("[SyncOrders] Progress: " + updated + "/" + actualBatchSize);
        }
      } else {
        errors++;
        Logger.log("[SyncOrders] ✗ payment_id=" + paymentId + " code=" + code + " response=" + res.getContentText());
      }
    } catch (e) {
      errors++;
      Logger.log("[SyncOrders] ✗ payment_id=" + paymentId + " error=" + e);
    }

    Utilities.sleep(50); // Rate limiting
  }

  Logger.log("=== syncAllOrdersToSupabase COMPLETE ===");
  Logger.log("Processed rows: " + startRow + " to " + endRow);
  Logger.log("Updated: " + updated);
  Logger.log("Skipped (no payment_id): " + skipped);
  Logger.log("Errors: " + errors);

  const nextOffset = offset + batchSize;
  if (nextOffset < totalRows) {
    Logger.log("\n=== NEXT BATCH ===");
    Logger.log("To continue, run: syncAllOrdersToSupabase(" + nextOffset + ", " + batchSize + ")");
    Logger.log("Remaining rows: " + (totalRows - nextOffset));
  } else {
    Logger.log("\n=== ALL BATCHES COMPLETE ===");
    Logger.log("Total rows processed: " + totalRows);
  }
}

// 全件同期を一度に実行（小規模データセット用）
function syncAllOrdersToSupabaseOneShot() {
  syncAllOrdersToSupabase(0, 10000);
}

// 行数確認
function checkNonameMasterRowCount() {
  const ss = SpreadsheetApp.openById(NONAME_MASTER_SHEET_ID);
  const sheet = ss.getSheets()[0];

  if (!sheet) {
    Logger.log("ERROR: Sheet not found");
    return;
  }

  const lastRow = sheet.getLastRow();
  const totalRows = lastRow - 1;

  Logger.log("=== Noname Master Row Count ===");
  Logger.log("Total rows (including header): " + lastRow);
  Logger.log("Data rows (excluding header): " + totalRows);
  Logger.log("");
  Logger.log("=== Batch Recommendations ===");
  Logger.log("For 100 rows per batch: " + Math.ceil(totalRows / 100) + " batches needed");
  Logger.log("For 500 rows per batch: " + Math.ceil(totalRows / 500) + " batches needed");
}
