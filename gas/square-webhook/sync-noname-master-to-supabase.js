// のなめマスターシート全件をSupabaseのordersテーブルに同期

const SHEET_NAME_NONAME_MASTER = "のなめマスター";

function syncNonameMasterToSupabase(offset, batchSize) {
  offset = offset || 0;
  batchSize = batchSize || 100;

  Logger.log("=== syncNonameMasterToSupabase START ===");
  Logger.log("Offset: " + offset + ", Batch size: " + batchSize);

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("[SyncOrders] ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_NONAME_MASTER);

  if (!sheet) {
    Logger.log("[SyncOrders] ERROR: Sheet not found: " + SHEET_NAME_NONAME_MASTER);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("[SyncOrders] No data to sync");
    return;
  }

  const totalRows = lastRow - 1;
  const startRow = 2 + offset;
  const endRow = Math.min(startRow + batchSize - 1, lastRow);
  const actualBatchSize = endRow - startRow + 1;

  if (offset >= totalRows) {
    Logger.log("[SyncOrders] Offset exceeds total rows");
    return;
  }

  Logger.log("[SyncOrders] Total rows: " + totalRows);
  Logger.log("[SyncOrders] Processing rows " + startRow + " to " + endRow);

  // 全列を読み取る（35列想定）
  const allData = sheet.getRange(startRow, 1, actualBatchSize, 35).getValues();

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];

    // 列インデックス（0-based）
    const paymentId = normPid_(row[16]); // Q列 payment_id
    const patientId = normPid_(row[15]); // P列 patient_id

    if (!paymentId) {
      skipped++;
      continue;
    }

    // 決済日時（B列）
    const paidAtRaw = row[1];
    let paidAt = null;
    if (paidAtRaw) {
      try {
        if (paidAtRaw instanceof Date) {
          paidAt = paidAtRaw.toISOString();
        } else {
          // "2026/01/27 11:37:56" 形式を想定（JST）→ UTC変換
          const str = String(paidAtRaw).trim();
          const match = str.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
          if (match) {
            const [, y, m, d, hh, mm, ss] = match;
            // JST文字列をDateオブジェクトに変換してからUTC ISOに
            const jstDate = new Date(y + "-" + m + "-" + d + "T" + hh + ":" + mm + ":" + ss + "+09:00");
            paidAt = jstDate.toISOString();
          } else {
            paidAt = new Date(paidAtRaw).toISOString();
          }
        }
      } catch (e) {
        Logger.log("[SyncOrders] Failed to parse paid_at for " + paymentId + ": " + e);
      }
    }

    // refunded_at（Z列 = 25）
    const refundedAtRaw = row[25];
    let refundedAt = null;
    if (refundedAtRaw) {
      try {
        if (refundedAtRaw instanceof Date) {
          refundedAt = refundedAtRaw.toISOString();
        } else {
          // "2026/01/27 11:37:56" 形式を想定（JST）→ UTC変換
          const str = String(refundedAtRaw).trim();
          const match = str.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
          if (match) {
            const [, y, m, d, hh, mm, ss] = match;
            // JST文字列をDateオブジェクトに変換してからUTC ISOに
            const jstDate = new Date(y + "-" + m + "-" + d + "T" + hh + ":" + mm + ":" + ss + "+09:00");
            refundedAt = jstDate.toISOString();
          } else {
            refundedAt = new Date(refundedAtRaw).toISOString();
          }
        }
      } catch (e) {
        Logger.log("[SyncOrders] Failed to parse refunded_at for " + paymentId + ": " + e);
      }
    }

    // shipping_date（U列 = 20）
    const shippingDateRaw = row[20];
    let shippingDate = null;
    if (shippingDateRaw) {
      try {
        if (shippingDateRaw instanceof Date) {
          shippingDate = shippingDateRaw.toISOString().split('T')[0]; // YYYY-MM-DD形式
        } else {
          const str = String(shippingDateRaw).trim();
          if (str) {
            // 既に文字列の場合はそのまま使用
            shippingDate = str;
          }
        }
      } catch (e) {
        Logger.log("[SyncOrders] Failed to parse shipping_date for " + paymentId + ": " + e);
      }
    }

    // carrier推測（AC列 = 28: time_band）
    const timeBand = (row[28] || "").toString().trim();
    let carrier = null;
    if (timeBand && timeBand !== "") {
      carrier = "yamato";
    }

    const updateData = {
      id: paymentId,
      patient_id: patientId || null,
      product_code: (row[17] || "").toString().trim() || null, // R列
      product_name: (row[7] || "").toString().trim() || null,  // H列
      amount: parseFloat(row[8]) || 0,                         // I列
      paid_at: paidAt,
      shipping_status: (row[19] || "").toString().trim() || "pending", // T列
      shipping_date: shippingDate,        // U列
      tracking_number: (row[21] || "").toString().trim() || null,      // V列
      carrier: carrier,
      payment_status: (row[22] || "").toString().trim() || "COMPLETED", // W列
      refund_status: (row[23] || "").toString().trim() || null,         // X列
      refunded_at: refundedAt,
      refunded_amount: parseFloat(row[24]) || null                      // Y列
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
        const responseText = res.getContentText();
        Logger.log("[SyncOrders] ✗ payment_id=" + paymentId + " code=" + code);
        Logger.log("  Response: " + responseText);
        Logger.log("  Payload: " + JSON.stringify(updateData));
      }
    } catch (e) {
      errors++;
      Logger.log("[SyncOrders] ✗ payment_id=" + paymentId + " error=" + e);
    }

    Utilities.sleep(50);
  }

  Logger.log("=== syncNonameMasterToSupabase COMPLETE ===");
  Logger.log("Processed rows: " + startRow + " to " + endRow);
  Logger.log("Updated: " + updated);
  Logger.log("Skipped (no payment_id): " + skipped);
  Logger.log("Errors: " + errors);

  const nextOffset = offset + batchSize;
  if (nextOffset < totalRows) {
    Logger.log("\n=== NEXT BATCH ===");
    Logger.log("To continue, run: syncNonameMasterToSupabase(" + nextOffset + ", " + batchSize + ")");
    Logger.log("Remaining rows: " + (totalRows - nextOffset));
  } else {
    Logger.log("\n=== ALL BATCHES COMPLETE ===");
    Logger.log("Total rows processed: " + totalRows);
  }
}

function normPid_(v) {
  if (v === null || v === undefined) return "";
  var s = String(v).trim();
  if (s.endsWith(".0")) s = s.slice(0, -2);
  s = s.replace(/\s+/g, "");
  return s;
}

// 全件同期を一度に実行
function syncNonameMasterToSupabaseOneShot() {
  syncNonameMasterToSupabase(0, 10000);
}

// バッチ実行用ヘルパー関数（500件ずつ）
function runBatch1() {
  syncNonameMasterToSupabase(0, 500);
}

function runBatch2() {
  syncNonameMasterToSupabase(500, 500);
}

function runBatch3() {
  syncNonameMasterToSupabase(1000, 500);
}

function runBatch4() {
  syncNonameMasterToSupabase(1500, 500);
}

// 行数確認
function checkNonameMasterRowCount() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_NONAME_MASTER);

  if (!sheet) {
    Logger.log("ERROR: Sheet not found: " + SHEET_NAME_NONAME_MASTER);
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
