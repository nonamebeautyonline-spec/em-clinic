// 消えてしまったreserved_dateを問診シートから復元
function restoreReservedDateToSupabase() {
  Logger.log("=== restoreReservedDateToSupabase START ===");

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("[Restore] ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return;
  }

  const targetDate = "2026-01-27";

  // 1. 問診シートから今日の予約を取得
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const qSheet = ss.getSheetByName(SHEET_NAME_INTAKE);

  const lastRow = qSheet.getLastRow();
  const allData = qSheet.getRange(2, 1, lastRow - 1, 27).getValues();

  const pidToReservedData = {};

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const pid = normPid_(row[25]); // Z列 (patient_id)
    if (!pid) continue;

    const reservedDateRaw = row[7]; // H列
    let reservedDate = "";
    if (reservedDateRaw) {
      if (reservedDateRaw instanceof Date) {
        const year = reservedDateRaw.getFullYear();
        const month = String(reservedDateRaw.getMonth() + 1).padStart(2, '0');
        const day = String(reservedDateRaw.getDate()).padStart(2, '0');
        reservedDate = year + "-" + month + "-" + day;
      } else {
        reservedDate = String(reservedDateRaw).trim();
      }
    }

    if (reservedDate === targetDate) {
      const reservedTimeRaw = row[8]; // I列
      let reservedTime = "";

      if (reservedTimeRaw) {
        if (reservedTimeRaw instanceof Date) {
          // Dateオブジェクトの場合、HH:MM形式に変換
          const hours = String(reservedTimeRaw.getHours()).padStart(2, '0');
          const minutes = String(reservedTimeRaw.getMinutes()).padStart(2, '0');
          reservedTime = hours + ":" + minutes;
        } else {
          reservedTime = String(reservedTimeRaw).trim();
        }
      }

      pidToReservedData[pid] = {
        reserved_date: reservedDate,
        reserved_time: reservedTime
      };
    }
  }

  Logger.log("[Restore] Found " + Object.keys(pidToReservedData).length + " records for " + targetDate + " in intake sheet");

  // 2. 各patient_idについてSupabaseを更新
  let updated = 0;
  let errors = 0;

  for (const pid in pidToReservedData) {
    const data = pidToReservedData[pid];
    const endpoint = supabaseUrl + "/rest/v1/intake?patient_id=eq." + encodeURIComponent(pid);

    try {
      const res = UrlFetchApp.fetch(endpoint, {
        method: "patch",
        contentType: "application/json",
        headers: {
          "apikey": supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Prefer": "return=minimal"
        },
        payload: JSON.stringify(data),
        muteHttpExceptions: true,
        timeout: 10
      });

      const code = res.getResponseCode();
      if (code >= 200 && code < 300) {
        updated++;
        Logger.log("[Restore] ✓ patient_id=" + pid);
      } else {
        errors++;
        Logger.log("[Restore] ✗ patient_id=" + pid + " code=" + code + " body=" + res.getContentText());
      }
    } catch (e) {
      errors++;
      Logger.log("[Restore] ✗ patient_id=" + pid + " error=" + e);
    }

    Utilities.sleep(50);
  }

  Logger.log("=== restoreReservedDateToSupabase COMPLETE ===");
  Logger.log("Total records for " + targetDate + ": " + Object.keys(pidToReservedData).length);
  Logger.log("Updated: " + updated);
  Logger.log("Errors: " + errors);
}
