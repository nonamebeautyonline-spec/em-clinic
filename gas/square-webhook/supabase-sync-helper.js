/**
 * のなめマスターに追記された行をSupabaseに同期
 *
 * @param {Array} rowsData - のなめマスターに追記したデータ（配列の配列）
 *   各行は [user_id, 決済日時, Name, ..., payment_id, product_code, ...] の形式
 */
function syncNonameMasterRowsToSupabase_(rowsData) {
  if (!rowsData || rowsData.length === 0) return;

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("[SyncToSupabase] WARNING: SUPABASE_URL or SUPABASE_ANON_KEY not set. Skipping sync.");
    return;
  }

  let synced = 0;
  let errors = 0;

  for (let i = 0; i < rowsData.length; i++) {
    const row = rowsData[i];

    // 列インデックス（0-based）
    // A:user_id, B:決済日時, C:Name, D:Postal, E:Address, F:Email, G:Phone,
    // H:Product Name, I:Price, J-M:mg, N-O:cash/check,
    // P:patient_id, Q:payment_id, R:product_code, S:source,
    // T:shipping_status, U:shipping_date, V:tracking_number, W:note

    const paymentId = normPid_(row[16]); // Q: payment_id
    const patientId = normPid_(row[15]); // P: patient_id

    if (!paymentId) {
      Logger.log("[SyncToSupabase] Skipping row without payment_id");
      continue;
    }

    // 決済日時（B列）の変換
    const paidAtRaw = row[1];
    let paidAt = null;
    if (paidAtRaw) {
      try {
        if (paidAtRaw instanceof Date) {
          paidAt = paidAtRaw.toISOString();
        } else {
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
        Logger.log("[SyncToSupabase] Failed to parse paid_at: " + e);
      }
    }

    const orderData = {
      id: paymentId,
      patient_id: patientId || null,
      product_code: (row[17] || "").toString().trim() || null, // R
      product_name: (row[7] || "").toString().trim() || null,  // H
      amount: parseFloat(row[8]) || 0,                         // I
      paid_at: paidAt,
      shipping_status: "pending", // 初期値（後で更新される）
      shipping_date: null,
      tracking_number: null,
      carrier: null,
      payment_status: "COMPLETED",
      refund_status: null,
      refunded_at: null,
      refunded_amount: null
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
        payload: JSON.stringify(orderData),
        muteHttpExceptions: true,
        timeout: 10
      });

      const code = res.getResponseCode();
      if (code >= 200 && code < 300) {
        synced++;
      } else {
        errors++;
        Logger.log("[SyncToSupabase] ✗ payment_id=" + paymentId + " code=" + code);
      }
    } catch (e) {
      errors++;
      Logger.log("[SyncToSupabase] ✗ payment_id=" + paymentId + " error=" + e);
    }

    Utilities.sleep(50);
  }

  Logger.log("[SyncToSupabase] Synced " + synced + " orders to Supabase (errors: " + errors + ")");
}

function normPid_(v) {
  if (v === null || v === undefined) return "";
  var s = String(v).trim();
  if (s.endsWith(".0")) s = s.slice(0, -2);
  s = s.replace(/\s+/g, "");
  return s;
}
