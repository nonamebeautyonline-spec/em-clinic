// ===== 予約用 GAS（1枠あたり2人まで ＋ 1人1件まで） =====

const SPREADSHEET_ID = "1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo";
const SHEET_NAME_RESERVE = "予約";

const SLOT_CAPACITY = 2; // 1枠あたり2人まで

// 列番号（1始まり）
const COL_TIMESTAMP   = 1; // A
const COL_RESERVE_ID  = 2; // B
const COL_PATIENT_ID  = 3; // C: PatientID（旧 lineId）
const COL_NAME        = 4; // D
const COL_DATE        = 5; // E
const COL_TIME        = 6; // F
const COL_STATUS      = 7; // G: status（キャンセルなど）

// 問診シート（PID一致行に reserveId / 日時を同期する用）
const SHEET_NAME_INTAKE           = "問診";
const COL_RESERVE_ID_INTAKE       = 2;  // B: reserveId
const COL_RESERVED_DATE_INTAKE    = 8;  // H: reserved_date
const COL_RESERVED_TIME_INTAKE    = 9;  // I: reserved_time
const COL_PID_INTAKE              = 26; // Z: patient_id (Patient_ID を転記済み想定)

    function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===================================
// Supabase書き込み関数
// ===================================

/**
 * 予約情報をSupabase intakeテーブルに反映（upsert）
 * @param {string} reserveId - 予約ID
 * @param {string} patientId - Patient ID
 * @param {string} reservedDate - YYYY-MM-DD
 * @param {string} reservedTime - HH:MM
 * @param {SpreadsheetApp.Spreadsheet} ss - スプレッドシート（患者情報取得用）
 */
function updateSupabaseIntakeReservation_(reserveId, patientId, reservedDate, reservedTime, ss) {
  Logger.log("[Supabase] updateSupabaseIntakeReservation_ called: reserveId=" + reserveId + ", patientId=" + patientId + ", date=" + reservedDate + ", time=" + reservedTime);

  if (!patientId) {
    Logger.log("[Supabase] ERROR: Missing patientId, skipping");
    return;
  }

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  Logger.log("[Supabase] Config check: URL=" + (supabaseUrl ? "SET" : "MISSING") + ", KEY=" + (supabaseKey ? "SET (length=" + supabaseKey.length + ")" : "MISSING"));

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("[Supabase] ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in Script Properties");
    return;
  }

  // ★ 患者情報を取得（問診シート → 問診マスター → reservationsテーブルの順）
  let patientInfo = null;
  let patientName = null;

  if (ss) {
    // 1. 問診シートから氏名を取得（最優先）
    patientName = findNameFromIntakeByPid_(ss, patientId);
    if (patientName) {
      Logger.log("[Supabase] Found patient name from intake sheet: " + patientName);
    } else {
      Logger.log("[Supabase] No patient name in intake sheet, trying master");
    }

    // 2. 問診マスターから取得（問診シートになければ、または追加情報のため）
    patientInfo = findPatientInfoFromMaster_(ss, patientId);
    if (patientInfo && patientInfo.name) {
      Logger.log("[Supabase] Found patient info from master: name=" + patientInfo.name);
      // 問診シートから取得できなかった場合のみ、マスターの氏名を使用
      if (!patientName) {
        patientName = patientInfo.name;
      }
    } else {
      Logger.log("[Supabase] No patient info in master");
    }
  }

  // 3. それでも無い場合は、reservationsテーブルから取得を試みる
  if (!patientName && reserveId) {
    Logger.log("[Supabase] Trying to fetch patient_name from reservations table");
    patientName = findNameFromReservationsTable_(reserveId, supabaseUrl, supabaseKey);
    if (patientName) {
      Logger.log("[Supabase] Found patient name from reservations table: " + patientName);
    } else {
      Logger.log("[Supabase] No patient name found in reservations table either");
    }
  }

  // patient_idでレコードを検索してupsert
  const url = supabaseUrl + "/rest/v1/intake?patient_id=eq." + encodeURIComponent(patientId);
  Logger.log("[Supabase] GET request URL: " + url);

  try {
    // 既存レコードを取得
    const getRes = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey
      },
      muteHttpExceptions: true
    });

    const code = getRes.getResponseCode();
    const body = getRes.getContentText();
    Logger.log("[Supabase] GET response code: " + code + ", body length: " + body.length);

    if (code === 200) {
      const records = JSON.parse(body);
      Logger.log("[Supabase] Found " + records.length + " existing record(s)");

      if (records.length > 0) {
        // 既存レコードを更新（PATCH）
        const record = records[0];
        const patchUrl = supabaseUrl + "/rest/v1/intake?id=eq." + record.id;
        Logger.log("[Supabase] PATCH request URL: " + patchUrl);

        // ★ patient_nameが空の場合は患者情報も更新
        const patchData = {
          reserve_id: reserveId,
          reserved_date: reservedDate || null,
          reserved_time: reservedTime || null
        };

        // patientNameがある場合は常に更新（どのソースからでも）
        if (patientName && (!record.patient_name || record.patient_name.trim() === "")) {
          Logger.log("[Supabase] Updating patient_name (was empty): " + patientName);
          patchData.patient_name = patientName;

          // patientInfoがある場合（マスターから取得できた場合）は全情報を含める
          if (patientInfo) {
            Logger.log("[Supabase] Including full patient info from master");
            const answers = record.answers || {};
            answers.name = patientInfo.name;
            answers["氏名"] = patientInfo.name;
            answers.sex = patientInfo.sex;
            answers["性別"] = patientInfo.sex;
            answers.birth = patientInfo.birth;
            answers["生年月日"] = patientInfo.birth;
            answers.tel = patientInfo.tel;
            answers["電話番号"] = patientInfo.tel;
            answers.name_kana = patientInfo.name_kana;
            answers["カナ"] = patientInfo.name_kana;

            patchData.answers = answers;
          } else {
            // マスター以外から取得した場合は氏名だけ更新
            Logger.log("[Supabase] Updating name only (from intake sheet or reservations table)");
            const answers = record.answers || {};
            answers.name = patientName;
            answers["氏名"] = patientName;
            patchData.answers = answers;
          }
        }

        const patchRes = UrlFetchApp.fetch(patchUrl, {
          method: "patch",
          contentType: "application/json",
          headers: {
            "apikey": supabaseKey,
            "Authorization": "Bearer " + supabaseKey
          },
          payload: JSON.stringify(patchData),
          muteHttpExceptions: true
        });

        const patchCode = patchRes.getResponseCode();
        Logger.log("[Supabase] PATCH response code: " + patchCode);

        if (patchCode >= 200 && patchCode < 300) {
          Logger.log("[Supabase] SUCCESS: Updated reservation for patient_id=" + patientId);
        } else {
          Logger.log("[Supabase] ERROR: PATCH failed (code " + patchCode + "): " + patchRes.getContentText());
        }
      } else {
        // レコードが存在しない場合はINSERT
        Logger.log("[Supabase] No existing record, creating new record for patient_id=" + patientId);

        // ★ 患者情報を含めて新規作成
        const insertData = {
          reserve_id: reserveId,
          patient_id: patientId,
          reserved_date: reservedDate || null,
          reserved_time: reservedTime || null,
          answers: {}
        };

        if (patientInfo) {
          Logger.log("[Supabase] Including full patient info in INSERT (from master)");
          insertData.patient_name = patientInfo.name;

          // answersに個人情報を含める
          insertData.answers = {
            name: patientInfo.name,
            "氏名": patientInfo.name,
            sex: patientInfo.sex,
            "性別": patientInfo.sex,
            birth: patientInfo.birth,
            "生年月日": patientInfo.birth,
            tel: patientInfo.tel,
            "電話番号": patientInfo.tel,
            name_kana: patientInfo.name_kana,
            "カナ": patientInfo.name_kana
          };
        } else if (patientName) {
          Logger.log("[Supabase] Including patient name in INSERT (from intake sheet or reservations table)");
          insertData.patient_name = patientName;
          insertData.answers = {
            name: patientName,
            "氏名": patientName
          };
        }

        const insertUrl = supabaseUrl + "/rest/v1/intake";
        const insertRes = UrlFetchApp.fetch(insertUrl, {
          method: "post",
          contentType: "application/json",
          headers: {
            "apikey": supabaseKey,
            "Authorization": "Bearer " + supabaseKey,
            "Prefer": "return=minimal"
          },
          payload: JSON.stringify(insertData),
          muteHttpExceptions: true
        });

        const insertCode = insertRes.getResponseCode();
        Logger.log("[Supabase] INSERT response code: " + insertCode);

        if (insertCode >= 200 && insertCode < 300) {
          Logger.log("[Supabase] SUCCESS: Created reservation record for patient_id=" + patientId);
        } else {
          Logger.log("[Supabase] ERROR: INSERT failed (code " + insertCode + "): " + insertRes.getContentText());
        }
      }
    } else {
      Logger.log("[Supabase] ERROR: GET request failed with code " + code + ": " + body);
    }
  } catch (e) {
    Logger.log("[Supabase] EXCEPTION: Error updating reservation: " + e);
    Logger.log("[Supabase] EXCEPTION stack: " + e.stack);
  }
}


function doPost(e) {
  try {
    const raw = e.postData && e.postData.contents ? e.postData.contents : "{}";
    Logger.log("RESERVE doPost raw: " + raw);

    const body = JSON.parse(raw);
    const type = body.type || "createReservation";

    const adminTypes = new Set([
  "getDoctors",
  "upsertDoctor",
  "getWeeklyRules",
  "upsertWeeklyRules",
  "getOverrides",
  "upsertOverride",
  "deleteOverride",
  "getScheduleRange",
  "backfill_reservations",
  "backfill_all_future_reservations",
]);

const token = String(body.token || "");
if (adminTypes.has(type)) {
  const expected = PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN") || "";
  if (!expected || token !== expected) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

    // ========= backfill_reservations（既存予約データをSupabaseに同期） =========
    if (type === "backfill_reservations") {
      const targetDate = String(body.date || "").trim();
      Logger.log("[Backfill] Starting reservation backfill for date: " + targetDate);

      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(SHEET_NAME_RESERVE);

      if (!sheet) {
        return jsonResponse({ ok: false, error: "sheet_not_found" });
      }

      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return jsonResponse({ ok: true, processed: 0, synced: 0, errors: 0, details: [] });
      }

      // A〜G（timestamp, reserveId, patientId, name, date, time, status）を読む
      const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

      let processed = 0;
      let synced = 0;
      let errors = 0;
      let skipped = 0;
      const details = [];
      const MAX_PROCESS = 100; // 一度に最大100件まで処理

      // 最初の5件をログ出力（デバッグ用）
      Logger.log("[Backfill] Total rows: " + values.length);
      for (let i = 0; i < Math.min(5, values.length); i++) {
        Logger.log("[Backfill] Sample row " + (i + 2) + ": " + JSON.stringify(values[i]));
      }

      for (let i = 0; i < values.length && processed < MAX_PROCESS; i++) {
        const row = values[i];
        const reserveId = String(row[1] || "").trim();  // B: reserveId
        const patientId = String(row[2] || "").trim();  // C: patientId
        const name = String(row[3] || "").trim();       // D: name
        const dateRaw = row[4];  // E: date（Date型の可能性）
        const timeRaw = row[5];  // F: time（Date型の可能性）
        const status = String(row[6] || "").trim();     // G: status

        // 日付を正規化
        const date = toYMD_(dateRaw);
        const time = toHHMM_(timeRaw);

        // ターゲット日付が指定されている場合はフィルタ
        if (targetDate && date !== targetDate) {
          skipped++;
          continue;
        }

        // キャンセルされた予約はスキップ
        if (status === "キャンセル") continue;

        processed++;

        if (!reserveId || !patientId) {
          errors++;
          details.push(`Row ${i + 2}: Missing reserveId or patientId`);
          continue;
        }

        try {
          writeToSupabaseReservation_({
            reserve_id: reserveId,
            patient_id: patientId,
            patient_name: name,
            reserved_date: date,
            reserved_time: time,
            status: "pending",
            note: null,
            prescription_menu: null
          });
          synced++;
          details.push(`✓ ${reserveId} (${name}) - ${date} ${time}`);
        } catch (e) {
          errors++;
          details.push(`✗ ${reserveId}: ${e}`);
          Logger.log("[Backfill] Error syncing reservation " + reserveId + ": " + e);
        }
      }

      Logger.log("[Backfill] Completed: processed=" + processed + " synced=" + synced + " errors=" + errors + " skipped=" + skipped);

      return jsonResponse({
        ok: true,
        processed: processed,
        synced: synced,
        errors: errors,
        skipped: skipped,
        total_rows: values.length,
        details: details.slice(0, 50) // 最大50件まで返す
      });
    }

    // ========= backfill_all_future_reservations（今後の全予約をSupabaseに同期） =========
    if (type === "backfill_all_future_reservations") {
      Logger.log("[Backfill] Starting ALL future reservations backfill");

      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(SHEET_NAME_RESERVE);

      if (!sheet) {
        return jsonResponse({ ok: false, error: "sheet_not_found" });
      }

      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return jsonResponse({ ok: true, processed: 0, synced: 0, errors: 0, details: [] });
      }

      // 今日の日付を取得
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = toYMD_(today);

      Logger.log("[Backfill] Today: " + todayStr);

      // A〜G（timestamp, reserveId, patientId, name, date, time, status）を読む
      const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

      let processed = 0;
      let synced = 0;
      let errors = 0;
      let skipped = 0;
      const details = [];

      Logger.log("[Backfill] Total rows: " + values.length);

      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const reserveId = String(row[1] || "").trim();  // B: reserveId
        const patientId = String(row[2] || "").trim();  // C: patientId
        const name = String(row[3] || "").trim();       // D: name
        const dateRaw = row[4];  // E: date（Date型の可能性）
        const timeRaw = row[5];  // F: time（Date型の可能性）
        const status = String(row[6] || "").trim();     // G: status

        // 日付を正規化
        const date = toYMD_(dateRaw);
        const time = toHHMM_(timeRaw);

        // 今日以降の予約のみ対象
        if (!date || date < todayStr) {
          skipped++;
          continue;
        }

        // キャンセルされた予約はスキップ
        if (status === "キャンセル") {
          skipped++;
          continue;
        }

        processed++;

        if (!reserveId || !patientId) {
          errors++;
          details.push(`Row ${i + 2}: Missing reserveId or patientId`);
          continue;
        }

        try {
          writeToSupabaseReservation_({
            reserve_id: reserveId,
            patient_id: patientId,
            patient_name: name,
            reserved_date: date,
            reserved_time: time,
            status: "pending",
            note: null,
            prescription_menu: null
          });
          synced++;
          if (details.length < 50) {
            details.push(`✓ ${reserveId} (${name}) - ${date} ${time}`);
          }
        } catch (e) {
          errors++;
          details.push(`✗ ${reserveId}: ${e}`);
          Logger.log("[Backfill] Error syncing reservation " + reserveId + ": " + e);
        }
      }

      Logger.log("[Backfill] Completed: processed=" + processed + " synced=" + synced + " errors=" + errors + " skipped=" + skipped);

      return jsonResponse({
        ok: true,
        processed: processed,
        synced: synced,
        errors: errors,
        skipped: skipped,
        total_rows: values.length,
        today: todayStr,
        details: details
      });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME_RESERVE);

    function toYMD_(v) {
  if (v === null || v === undefined || v === "") return "";
  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, "Asia/Tokyo", "yyyy-MM-dd");
  }
  const s = String(v).trim();
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return s;
}

function toHHMM_(v) {
  if (v === null || v === undefined || v === "") return "";
  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime())) {
    const h = v.getHours();
    const m = v.getMinutes();
    return ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
  }
  const s = String(v).trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return ("0" + Number(m[1])).slice(-2) + ":" + m[2];
  return s;
}


// ---------- ① 予約作成（createReservation） ----------
if (type === "createReservation") {
  // ★ date/time は必ず正規化（表記ゆれ吸収）
  const reqDate = toYMD_(body.date);
  const reqTime = toHHMM_(body.time);

  const patientId = String(body.patient_id || "").trim();
  if (!patientId) {
    return jsonResponse({ ok: false, error: "patient_id_required" });
  }

  const name = findNameFromIntakeByPid_(ss, patientId);

  if (!reqDate || !reqTime) {
    return jsonResponse({ ok: false, error: "invalid_request" });
  }

  // 🔒 ロックを取って「1人1件制限」と「枠カウント」をまとめて制御
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    // ===== 営業時間チェック（dr_default共通枠） =====
    const sch = getEffectiveSchedule_(ss, reqDate, SCHEDULE_DOCTOR_ID_DEFAULT);

    if (!sch.isOpen) {
      return jsonResponse({ ok: false, error: "outside_hours", reason: sch.reason });
    }

    // time が営業時間内か + 15分刻みかチェック
    const tMin = parseMin_(reqTime);
    const sMin = parseMin_(sch.start);
    const eMin = parseMin_(sch.end);

    if (Number.isNaN(tMin) || Number.isNaN(sMin) || Number.isNaN(eMin)) {
      return jsonResponse({ ok: false, error: "invalid_time" });
    }

    // start <= time < end
    if (!(sMin <= tMin && tMin < eMin)) {
      return jsonResponse({ ok: false, error: "outside_hours" });
    }

    // 15分刻み（slot_minutes）
    if (sch.slotMinutes > 0 && ((tMin - sMin) % sch.slotMinutes !== 0)) {
      return jsonResponse({ ok: false, error: "invalid_slot" });
    }

    // ===== 既存予約（1人1件）＆ 枠カウント（capacity）を一括判定（高速化） =====
    const lastRow = sheet.getLastRow();
    const numRows = Math.max(0, lastRow - 1);

    let hasActiveReservation = false;
    let count = 0;

    if (numRows > 0) {
      // C..G（patient_id, name, date, time, status）を一括取得
      const rows = sheet.getRange(2, COL_PATIENT_ID, numRows, 5).getDisplayValues();
      // idx: 0=C pid, 2=E date, 3=F time, 4=G status

      for (let i = 0; i < rows.length; i++) {
        const pid = String(rows[i][0] || "").trim();
        const d   = String(rows[i][2] || "").trim();
        const t   = String(rows[i][3] || "").trim();
        const st  = String(rows[i][4] || "").trim();

        // 1人1件（キャンセル以外が1つでもあればNG）
        if (pid && pid === patientId && st !== "キャンセル") {
          hasActiveReservation = true;
          break;
        }

        // 枠カウント（キャンセル除外）
        if (d === reqDate && t === reqTime && st !== "キャンセル") {
          count++;
        }
      }
    }

    if (hasActiveReservation) {
      return jsonResponse({ ok: false, error: "already_reserved" });
    }

    if (count >= sch.capacity) {
      return jsonResponse({ ok: false, error: "slot_full" });
    }

    // ===== 予約OK → 行追加 =====
    // ★ Next.jsから渡されたreserveIdを優先、なければ生成
    const reserveId = body.reserveId || body.reserve_id || ("resv-" + new Date().getTime());
    const now = new Date();

    sheet.appendRow([
      now,       // A: timestamp
      reserveId, // B: reserveId
      patientId, // C: PatientID（PID）
      name,      // D: 名前
      reqDate,   // E: "YYYY-MM-DD"
      reqTime,   // F: "HH:mm"
      "",        // G: status（空＝有効）
    ]);

    // ===== 問診シート側に reserveId / 日時を同期（最小アクセス） =====
    const intakeSheet = ss.getSheetByName(SHEET_NAME_INTAKE);
    if (intakeSheet) {
      const lastIntakeRow = intakeSheet.getLastRow();
      if (lastIntakeRow >= 2) {
        // PID列（Z）だけ見る
        const pidCol = intakeSheet.getRange(2, COL_PID_INTAKE, lastIntakeRow - 1, 1).getValues();

        for (let i = pidCol.length - 1; i >= 0; i--) {
          const pid = String(pidCol[i][0] || "").trim();
          if (!pid || pid !== patientId) continue;

          const rowNo = i + 2;
          intakeSheet.getRange(rowNo, COL_RESERVE_ID_INTAKE).setValue(reserveId);
          intakeSheet.getRange(rowNo, COL_RESERVED_DATE_INTAKE).setValue(reqDate);
          intakeSheet.getRange(rowNo, COL_RESERVED_TIME_INTAKE).setValue(reqTime);
          break; // 問診は1回のみ前提
        }
      }
    }

    // ===== Supabaseに予約情報を反映（skipSupabaseフラグがない場合のみ） =====
    var supabaseError = null;
    const skipSupabase = body.skipSupabase === true;
    if (!skipSupabase) {
      try {
        // ★ intakeテーブルを更新
        updateSupabaseIntakeReservation_(reserveId, patientId, reqDate, reqTime, ss);

        // ★ reservationsテーブルにも書き込む
        writeToSupabaseReservation_({
          reserve_id: reserveId,
          patient_id: patientId,
          patient_name: name,
          reserved_date: reqDate,
          reserved_time: reqTime,
          status: "pending",
          note: null,
          prescription_menu: null
        });

        // ★ キャッシュ無効化
        invalidateVercelCache_(patientId);
      } catch (e) {
        supabaseError = String(e);
        Logger.log("[Supabase] Reservation update failed: " + e);
      }
    } else {
      Logger.log("[Supabase] Reservation write skipped (skipSupabase=true)");
    }

    return jsonResponse({
      ok: true,
      reserveId: reserveId,
      supabaseSync: skipSupabase ? "skipped" : (supabaseError ? "failed: " + supabaseError : "attempted")
    });
  } finally {
    lock.releaseLock();
  }
}

    // ---------- ② 予約日時変更（updateReservation） ----------
    if (type === "updateReservation") {
      const reserveId = String(body.reserveId || body.reservationId || body.id || "").trim();
      const newDate   = String(body.date || "").trim(); // "2025-12-05"
      const newTime   = String(body.time || "").trim(); // "10:00"

      Logger.log(
        "updateReservation request: reserveId=" +
          reserveId +
          " date=" +
          newDate +
          " time=" +
          newTime
      );

      if (!reserveId || !newDate || !newTime) {
        return ContentService.createTextOutput(
          JSON.stringify({
            ok: false,
            error: "reserveId/date/time required",
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      const reserveSheet = ss.getSheetByName(SHEET_NAME_RESERVE);
      const values = reserveSheet.getDataRange().getValues();

      let found = false;
      let patientId = "";

      // 予約シートの日時を更新
      for (let r = 1; r < values.length; r++) {
        // values[0] はヘッダ
        const rid = String(values[r][COL_RESERVE_ID - 1] || "").trim();
        if (!rid) continue;
        if (rid === reserveId) {
          patientId = String(values[r][COL_PATIENT_ID - 1] || "").trim();
          reserveSheet.getRange(r + 1, COL_DATE).setValue(newDate);
          reserveSheet.getRange(r + 1, COL_TIME).setValue(newTime);
          found = true;
          Logger.log("updateReservation row: " + (r + 1));
          break;
        }
      }

      if (!found) {
        return ContentService.createTextOutput(
          JSON.stringify({ ok: false, error: "reserveId not found" })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      // 問診シート側の予約日／時間も更新（あれば）
      const intakeSheet = ss.getSheetByName(SHEET_NAME_INTAKE);
      if (intakeSheet) {
        const intakeValues = intakeSheet.getDataRange().getValues();
        for (let r = 1; r < intakeValues.length; r++) {
          const rid = String(
            intakeValues[r][COL_RESERVE_ID_INTAKE - 1] || ""
          ).trim();
          if (!rid) continue;
          if (rid === reserveId) {
            intakeSheet
              .getRange(r + 1, COL_RESERVED_DATE_INTAKE)
              .setValue(newDate);
            intakeSheet
              .getRange(r + 1, COL_RESERVED_TIME_INTAKE)
              .setValue(newTime);
            Logger.log("updateReservation (intake) row: " + (r + 1));
          }
        }
      }

      // ===== Supabaseに予約変更を反映 =====
      var supabaseError = null;
      if (patientId) {
        try {
          // ★ intakeテーブルを更新
          updateSupabaseIntakeReservation_(reserveId, patientId, newDate, newTime, ss);

          // ★ reservationsテーブルも更新
          const patientName = findNameFromIntakeByPid_(ss, patientId);
          writeToSupabaseReservation_({
            reserve_id: reserveId,
            patient_id: patientId,
            patient_name: patientName,
            reserved_date: newDate,
            reserved_time: newTime,
            status: "pending",
            note: null,
            prescription_menu: null
          });

          // ★ キャッシュ無効化
          invalidateVercelCache_(patientId);
        } catch (e) {
          supabaseError = String(e);
          Logger.log("[Supabase] Reservation update failed: " + e);
        }
      }

      return ContentService.createTextOutput(
        JSON.stringify({
          ok: true,
          patientId: patientId || null,
          supabaseSync: supabaseError ? "failed: " + supabaseError : (patientId ? "attempted" : "skipped")
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }


    // ---------- ③ 予約キャンセル（cancelReservation） ----------

    if (type === "cancelReservation") {
      const reserveId = String(body.reserveId || body.reservationId || body.id || "").trim();
      Logger.log("cancelReservation request: reserveId=" + reserveId);

      if (!reserveId) {
        return ContentService.createTextOutput(
          JSON.stringify({ ok: false, error: "reserveId required" })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return ContentService.createTextOutput(
          JSON.stringify({ ok: false, error: "no data" })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      const values = sheet.getDataRange().getValues();
      let found = false;

      // values[0] はヘッダ行なので、1行目（シート上2行目）から
      for (let r = 1; r < values.length; r++) {
        const row = values[r];
        const rid = String(row[COL_RESERVE_ID - 1] || "").trim();
        if (!rid) continue;
        if (rid === reserveId) {
          sheet.getRange(r + 1, COL_STATUS).setValue("キャンセル");
          // 問診シート側の reserveId / 日時をクリア
const intakeSheet = ss.getSheetByName(SHEET_NAME_INTAKE);
if (intakeSheet) {
  const intakeValues = intakeSheet.getDataRange().getValues();
  for (let r = 1; r < intakeValues.length; r++) {
    const rid = String(intakeValues[r][COL_RESERVE_ID_INTAKE - 1] || "").trim();
    if (rid === reserveId) {
      intakeSheet.getRange(r + 1, COL_RESERVE_ID_INTAKE).setValue("");
      intakeSheet.getRange(r + 1, COL_RESERVED_DATE_INTAKE).setValue("");
      intakeSheet.getRange(r + 1, COL_RESERVED_TIME_INTAKE).setValue("");

      // ★ Supabaseに予約キャンセルを反映
      const patientId = normPid_(intakeValues[r][COL_PID_INTAKE - 1]);
      var supabaseError = null;
      if (patientId) {
        try {
          // ★ intakeテーブルの予約情報をクリア
          updateSupabaseIntakeReservation_(null, patientId, null, null, ss);

          // ★ reservationsテーブルのステータスを"canceled"に更新
          const patientName = findNameFromIntakeByPid_(ss, patientId);
          writeToSupabaseReservation_({
            reserve_id: reserveId,
            patient_id: patientId,
            patient_name: patientName,
            reserved_date: null,
            reserved_time: null,
            status: "canceled",
            note: null,
            prescription_menu: null
          });

          // ★ キャッシュ無効化
          invalidateVercelCache_(patientId);
        } catch (e) {
          supabaseError = String(e);
          Logger.log("[Supabase] Cancel update failed: " + e);
        }
      }

      Logger.log("intake cleared for canceled reserveId at row " + (r + 1) + ", supabase: " + (supabaseError || "ok"));
    }
  }
}

          Logger.log("cancelReservation row: " + (r + 1));
          found = true;
          break;
        }
      }

      if (!found) {
        return ContentService.createTextOutput(
          JSON.stringify({ ok: false, error: "reserveId not found" })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService.createTextOutput(
        JSON.stringify({ ok: true })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------- ④ 日付別一覧（listByDate） ----------
    // ---------- ④ 日付別一覧（listByDate） ----------
    if (type === "listByDate") {
      const targetDate = String(body.date || "").trim(); // "2025-12-12"
      Logger.log("listByDate request: date=" + targetDate);

      if (!targetDate) {
        return jsonResponse({ ok: false, error: "date required" });
      }

      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return jsonResponse({ ok: true, reservations: [] });
      }

      // E: date, F: time, G: status だけ見れば良い
      const values = sheet.getRange(2, COL_DATE, lastRow - 1, 3).getValues();
      const reservations = [];

      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const d = String(row[0] || "").trim(); // date
        const t = String(row[1] || "").trim(); // time
        const status = String(row[2] || "").trim(); // status

        if (!d || !t) continue;
        if (d !== targetDate) continue;
        if (status === "キャンセル") continue;

        reservations.push({
          date: d,
          time: t,
        });
      }

      return jsonResponse({ ok: true, reservations });
    }

    // ---------- ⑤ 範囲一覧（listRange） ----------
    if (type === "listRange") {
      const startDateStr = String(body.startDate || "").trim(); // "2025-12-11"
      const endDateStr   = String(body.endDate || "").trim();   // "2025-12-17"

      Logger.log(
        "listRange request: start=" + startDateStr + " end=" + endDateStr
      );

      if (!startDateStr || !endDateStr) {
        return jsonResponse({ ok: false, error: "startDate/endDate required" });
      }

      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return jsonResponse({ ok: true, slots: [] });
      }

      // E: date, F: time, G: status
      const values = sheet.getRange(2, COL_DATE, lastRow - 1, 3).getValues();

      // "YYYY-MM-DD" 形式なので、文字列比較で大小判定できる
      const startKey = startDateStr;
      const endKey   = endDateStr;

      const map = {}; // key = "YYYY-MM-DD|HH:mm" → count

      for (let i = 0; i < values.length; i++) {
        const row = values[i];
const dStr = toYMD_(row[0]);   // ★ yyyy-MM-dd に正規化
const tStr = toHHMM_(row[1]);  // ★ HH:mm に正規化

        const status = String(row[2] || "").trim(); // status

        if (!dStr || !tStr) continue;
        if (dStr < startKey || dStr > endKey) continue;
        if (status === "キャンセル") continue;

        const key = dStr + "|" + tStr;
        map[key] = (map[key] || 0) + 1;
      }

      const slots = [];
      for (const key in map) {
        const [d, t] = key.split("|");
        slots.push({
          date: d,
          time: t,
          count: map[key],
        });
      }

      // 並び替え（任意）
      slots.sort((a, b) => {
        if (a.date === b.date) {
          return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
        }
        return a.date < b.date ? -1 : 1;
      });

      return jsonResponse({ ok: true, slots });
    }

    // =========================
    // 管理UI（/rules / /slots）用 API
    //  ※ adminTypes + tokenチェックを通過した後にここへ来る想定
    // =========================

    if (type === "getDoctors") {
      const doctors = admin_getDoctors_(ss);
      return jsonResponse({ ok: true, doctors });
    }

    if (type === "upsertDoctor") {
      const doctor = admin_upsertDoctor_(ss, body.doctor || {});
      return jsonResponse({ ok: true, doctor });
    }

    if (type === "getWeeklyRules") {
      const doctorId = String(body.doctor_id || body.doctorId || "").trim();
      const rules = admin_getWeeklyRules_(ss, doctorId);
      return jsonResponse({ ok: true, rules });
    }

    if (type === "upsertWeeklyRules") {
      const doctorId = String(body.doctor_id || body.doctorId || "").trim();
      const rules = Array.isArray(body.rules) ? body.rules : [];
      const saved = admin_upsertWeeklyRules_(ss, doctorId, rules);
      return jsonResponse({ ok: true, rules: saved });
    }

    if (type === "getOverrides") {
      const doctorId = String(body.doctor_id || body.doctorId || "").trim();
      const start = String(body.start || "").trim();
      const end = String(body.end || "").trim();
      const overrides = admin_getOverrides_(ss, doctorId, start, end);
      return jsonResponse({ ok: true, overrides });
    }

    if (type === "upsertOverride") {
      const override = admin_upsertOverride_(ss, body.override || {});
      return jsonResponse({ ok: true, override });
    }

    if (type === "deleteOverride") {
      const doctorId = String(body.doctor_id || body.doctorId || "").trim();
      const date = String(body.date || "").trim(); // YYYY-MM-DD
      const deleted = admin_deleteOverride_(ss, doctorId, date);
      return jsonResponse({ ok: true, deleted });
    }

    if (type === "getScheduleRange") {
      const doctorId = String(body.doctor_id || body.doctorId || "").trim();
      const start = String(body.start || "").trim();
      const end = String(body.end || "").trim();

      const doctors = admin_getDoctors_(ss);
      const weekly_rules = admin_getWeeklyRules_(ss, doctorId);
      const overrides = admin_getOverrides_(ss, doctorId, start, end);

      return jsonResponse({ ok: true, doctors, weekly_rules, overrides });
    }


Logger.log("unknown type: " + type);
return jsonResponse({ ok: false, error: "unknown type" });
} catch (err) {
Logger.log("RESERVE doPost ERROR: " + err);
return jsonResponse({ ok: false, error: String(err) });
}

}

// =========================
// 管理UI用ユーティリティ & CRUD
// =========================
const SHEET_DOCTORS = "doctors";
const SHEET_WEEKLY = "weekly_rules";
const SHEET_OVERRIDES = "date_overrides";

function admin_getSheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error("Missing sheet: " + name);
  return sh;
}

function admin_read_(ss, sheetName) {
  const sh = admin_getSheet_(ss, sheetName);
  const values = sh.getDataRange().getValues();
  const headers = (values[0] || []).map(String);
  const rows = values.length >= 2 ? values.slice(1).map((r) => admin_rowToObj_(headers, r)) : [];
  return { sh, headers, rows };
}

function admin_rowToObj_(headers, row) {
  const o = {};
  for (let i = 0; i < headers.length; i++) o[headers[i]] = row[i];
  return o;
}

function admin_objToRow_(headers, obj) {
  return headers.map((h) => (obj[h] !== undefined ? obj[h] : ""));
}

function admin_nowIso_() {
  return new Date().toISOString();
}

// -------- doctors --------
function admin_getDoctors_(ss) {
  const { rows } = admin_read_(ss, SHEET_DOCTORS);
  return rows
    .map((d) => ({
      doctor_id: String(d.doctor_id || "").trim(),
      doctor_name: String(d.doctor_name || "").trim(),
      is_active: String(d.is_active).toUpperCase() === "TRUE",
      sort_order: Number(d.sort_order || 0),
      color: String(d.color || "").trim(),
    }))
    .filter((d) => d.doctor_id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function admin_upsertDoctor_(ss, doctor) {
  const did = String(doctor.doctor_id || "").trim();
  if (!did) throw new Error("doctor_id required");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const { sh, headers, rows } = admin_read_(ss, SHEET_DOCTORS);
    const idx = rows.findIndex((r) =>
  String(r.doctor_id || "").trim() === did && admin_dateToYMD_(r.date) === d
);


    const record = {
      doctor_id: did,
      doctor_name: String(doctor.doctor_name || ""),
      is_active: doctor.is_active ? "TRUE" : "FALSE",
      sort_order: doctor.sort_order != null ? Number(doctor.sort_order) : 0,
      color: String(doctor.color || ""),
    };

    if (idx >= 0) {
      sh.getRange(idx + 2, 1, 1, headers.length).setValues([admin_objToRow_(headers, record)]);
    } else {
      sh.appendRow(admin_objToRow_(headers, record));
    }
    return record;
  } finally {
    lock.releaseLock();
  }
}

// -------- weekly_rules --------
function admin_getWeeklyRules_(ss, doctorId) {
  const { rows } = admin_read_(ss, SHEET_WEEKLY);
  const did = String(doctorId || "").trim();

  return rows
    .filter((r) => (did ? String(r.doctor_id || "").trim() === did : true))
    .map((r) => ({
      doctor_id: String(r.doctor_id || "").trim(),
      weekday: Number(r.weekday),
      enabled: String(r.enabled).toUpperCase() === "TRUE",
start_time: admin_timeToHHMM_(r.start_time),
end_time: admin_timeToHHMM_(r.end_time),
      slot_minutes: Number(r.slot_minutes || 15),
      capacity: Number(r.capacity || 2),
      updated_at: String(r.updated_at || ""),
    }))
    .filter((r) => r.doctor_id && !Number.isNaN(r.weekday));
}

function admin_upsertWeeklyRules_(ss, doctorId, rules) {
  const did = String(doctorId || "").trim();
  if (!did) throw new Error("doctor_id required");
  if (!Array.isArray(rules)) throw new Error("rules must be array");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const { sh, headers, rows } = admin_read_(ss, SHEET_WEEKLY);

    // existing index by doctor_id + weekday
    const map = new Map();
    rows.forEach((r, i) => {
      const k = String(r.doctor_id || "").trim() + "::" + String(r.weekday);
      map.set(k, i);
    });

    for (const rule of rules) {
      const weekday = Number(rule.weekday);
      if (Number.isNaN(weekday) || weekday < 0 || weekday > 6) throw new Error("weekday must be 0..6");

      const record = {
        doctor_id: did,
        weekday: weekday,
        enabled: rule.enabled ? "TRUE" : "FALSE",
        start_time: String(rule.start_time || ""),
        end_time: String(rule.end_time || ""),
        slot_minutes: rule.slot_minutes != null ? Number(rule.slot_minutes) : 15,
        capacity: rule.capacity != null ? Number(rule.capacity) : 2,
        updated_at: admin_nowIso_(),
      };

      const key = did + "::" + String(weekday);
      if (map.has(key)) {
        const idx = map.get(key);
        sh.getRange(idx + 2, 1, 1, headers.length).setValues([admin_objToRow_(headers, record)]);
      } else {
        sh.appendRow(admin_objToRow_(headers, record));
      }
    }

    return admin_getWeeklyRules_(ss, did);
  } finally {
    lock.releaseLock();
  }
}

// -------- date_overrides --------
function admin_getOverrides_(ss, doctorId, start, end) {
  const { rows } = admin_read_(ss, SHEET_OVERRIDES);
  const did = String(doctorId || "").trim();
  const s = String(start || "").trim();
  const e = String(end || "").trim();

  return rows
    .filter((r) => (did ? String(r.doctor_id || "").trim() === did : true))
    .filter((r) => {
const d = admin_dateToYMD_(r.date);
      if (!s && !e) return true;
      if (s && d < s) return false;
      if (e && d > e) return false;
      return true;
    })
    .map((r) => ({
      doctor_id: String(r.doctor_id || "").trim(),
date: admin_dateToYMD_(r.date),
      type: String(r.type || "").trim(), // closed/open/modify
start_time: admin_timeToHHMM_(r.start_time),
end_time: admin_timeToHHMM_(r.end_time),

      slot_minutes: r.slot_minutes === "" ? "" : Number(r.slot_minutes || 15),
      capacity: r.capacity === "" ? "" : Number(r.capacity || 2),
      memo: String(r.memo || ""),
      updated_at: String(r.updated_at || ""),
    }))
    .filter((r) => r.doctor_id && r.date);
}

function admin_upsertOverride_(ss, override) {
  const did = String(override.doctor_id || "").trim();
  const date = String(override.date || "").trim();
  if (!did || !date) throw new Error("override.doctor_id and override.date required");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const { sh, headers, rows } = admin_read_(ss, SHEET_OVERRIDES);
    const idx = rows.findIndex(
      (r) => String(r.doctor_id || "").trim() === did && String(r.date || "").trim() === date
    );

    const record = {
      doctor_id: did,
      date: date,
      type: String(override.type || "modify"),
      start_time: String(override.start_time || ""),
      end_time: String(override.end_time || ""),
      slot_minutes: override.slot_minutes === "" || override.slot_minutes == null ? "" : Number(override.slot_minutes),
      capacity: override.capacity === "" || override.capacity == null ? "" : Number(override.capacity),
      memo: String(override.memo || ""),
      updated_at: admin_nowIso_(),
    };

    if (idx >= 0) {
      sh.getRange(idx + 2, 1, 1, headers.length).setValues([admin_objToRow_(headers, record)]);
    } else {
      sh.appendRow(admin_objToRow_(headers, record));
    }
    return record;
  } finally {
    lock.releaseLock();
  }
}

function admin_deleteOverride_(ss, doctorId, date) {
  const did = String(doctorId || "").trim();
  const d = String(date || "").trim();
  if (!did || !d) throw new Error("doctor_id and date required");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const { sh, rows } = admin_read_(ss, SHEET_OVERRIDES);
    const idx = rows.findIndex(
      (r) => String(r.doctor_id || "").trim() === did && String(r.date || "").trim() === d
    );
    if (idx < 0) return { found: false };
    sh.deleteRow(idx + 2);
    return { found: true };
  } finally {
    lock.releaseLock();
  }
}

function admin_timeToHHMM_(v) {
  if (v === null || v === undefined || v === "") return "";
  // Date 型（時刻セルは Date で来る）
  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime())) {
    const h = v.getHours();
    const m = v.getMinutes();
    return ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
  }
  // 文字列なら HH:MM だけ拾う（"Sat Dec..." 等も救済）
  const s = String(v).trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return ("0" + Number(m[1])).slice(-2) + ":" + m[2];
  return s;
}

// ===== 予約時チェック用（dr_default共通枠） =====
const SCHEDULE_DOCTOR_ID_DEFAULT = "dr_default";

function admin_dateToYMD_(v) {
  if (v === null || v === undefined || v === "") return "";
  // Date型
  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, "Asia/Tokyo", "yyyy-MM-dd");
  }
  // 文字列（YYYY-MM-DDが入っている場合を優先）
  const s = String(v).trim();
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return s;
}


function timeToHHMM_(v) {
  if (v === null || v === undefined || v === "") return "";
  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime())) {
    const h = v.getHours();
    const m = v.getMinutes();
    return ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
  }
  const s = String(v).trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return ("0" + Number(m[1])).slice(-2) + ":" + m[2];
  return s;
}

function parseMin_(hhmm) {
  const m = String(hhmm || "").match(/(\d{1,2}):(\d{2})/);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

// reqDate: "YYYY-MM-DD"
function getEffectiveSchedule_(ss, reqDate, doctorId) {
  const did = doctorId || SCHEDULE_DOCTOR_ID_DEFAULT;

  // weekday (0..6)
  const [y, mo, da] = reqDate.split("-").map(Number);
  const dt = new Date(y, (mo || 1) - 1, da || 1);
  const weekday = dt.getDay();

  // weekly_rules
  const weeklySh = ss.getSheetByName(SHEET_WEEKLY);
  if (!weeklySh) throw new Error("Missing sheet: weekly_rules");

  const wVals = weeklySh.getDataRange().getValues();
  const wHead = wVals[0].map(String);
  const idx = (name) => wHead.indexOf(name);

  const iDoctor = idx("doctor_id");
  const iWeekday = idx("weekday");
  const iEnabled = idx("enabled");
  const iStart = idx("start_time");
  const iEnd = idx("end_time");
  const iSlot = idx("slot_minutes");
  const iCap = idx("capacity");

  if ([iDoctor,iWeekday,iEnabled,iStart,iEnd,iSlot,iCap].some(v => v < 0)) {
    throw new Error("weekly_rules header mismatch");
  }

  let base = null;
  for (let r = 1; r < wVals.length; r++) {
    const row = wVals[r];
    const d = String(row[iDoctor] || "").trim();
    const wd = Number(row[iWeekday]);
    if (d === did && wd === weekday) {
      base = row;
      break;
    }
  }

  const baseEnabled = base ? String(base[iEnabled]).toUpperCase() === "TRUE" : false;
  const baseStart = base ? timeToHHMM_(base[iStart]) : "";
  const baseEnd = base ? timeToHHMM_(base[iEnd]) : "";
  const baseSlot = base ? Number(base[iSlot] || 15) : 15;
  const baseCap = base ? Number(base[iCap] || 2) : 2;

  // date_overrides（1 doctor × 1 date = 1行）
  const ovSh = ss.getSheetByName(SHEET_OVERRIDES);
  if (!ovSh) throw new Error("Missing sheet: date_overrides");

  const oVals = ovSh.getDataRange().getValues();
  const oHead = oVals[0].map(String);
  const oIdx = (name) => oHead.indexOf(name);

  const oDoctor = oIdx("doctor_id");
  const oDate = oIdx("date");
  const oType = oIdx("type");
  const oStart = oIdx("start_time");
  const oEnd = oIdx("end_time");
  const oSlot = oIdx("slot_minutes");
  const oCap = oIdx("capacity");

  if ([oDoctor,oDate,oType,oStart,oEnd,oSlot,oCap].some(v => v < 0)) {
    throw new Error("date_overrides header mismatch");
  }

let ov = null;
// ★末尾（最新行）から探す
for (let r = oVals.length - 1; r >= 1; r--) {
  const row = oVals[r];
  const d = String(row[oDoctor] || "").trim();
  const date = admin_dateToYMD_(row[oDate]);
  if (d === did && date === reqDate) {
    ov = row;
    break;
  }
}

  const ovType = ov ? String(ov[oType] || "").trim() : "";
  if (ovType === "closed") {
    return { isOpen: false, reason: "closed" };
  }

const overrideOpens = (ovType === "open" || ovType === "modify");
if (!baseEnabled && !overrideOpens) {
  return { isOpen: false, reason: "weekly_closed" };
}


  const start = ov ? (timeToHHMM_(ov[oStart]) || baseStart) : baseStart;
  const end = ov ? (timeToHHMM_(ov[oEnd]) || baseEnd) : baseEnd;

  const slotMinutes = ov && ov[oSlot] !== "" && ov[oSlot] != null ? Number(ov[oSlot]) : baseSlot;
  const capacity = ov && ov[oCap] !== "" && ov[oCap] != null ? Number(ov[oCap]) : baseCap;

  if (!start || !end) {
    return { isOpen: false, reason: "missing_hours" };
  }

  return { isOpen: true, start, end, slotMinutes, capacity };
}

function findNameFromIntakeByPid_(ss, patientId) {
  const sh = ss.getSheetByName(SHEET_NAME_INTAKE);
  if (!sh) return "";

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return "";

  // 問診シート：D=氏名, Z=patient_id
  const COL_NAME_INTAKE = 4; // D（1始まり）
  const values = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();

  // 最新行優先
  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const pid = String(row[COL_PID_INTAKE - 1] || "").trim(); // Z
    if (pid !== String(patientId).trim()) continue;

    const name = String(row[COL_NAME_INTAKE - 1] || "").trim();
    if (name) return name;
  }
  return "";
}

/**
 * Supabaseのreservationsテーブルからreserve_idで患者氏名を取得
 * @param {string} reserveId - Reserve ID
 * @param {string} supabaseUrl - Supabase URL
 * @param {string} supabaseKey - Supabase API key
 * @return {string} - 患者氏名（見つからない場合は空文字）
 */
function findNameFromReservationsTable_(reserveId, supabaseUrl, supabaseKey) {
  if (!reserveId || !supabaseUrl || !supabaseKey) return "";

  const url = supabaseUrl + "/rest/v1/reservations?reserve_id=eq." + encodeURIComponent(reserveId);

  try {
    const res = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey
      },
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    if (code !== 200) {
      Logger.log("[findNameFromReservationsTable_] Failed to fetch: code=" + code);
      return "";
    }

    const records = JSON.parse(res.getContentText());
    if (records.length > 0 && records[0].patient_name) {
      return String(records[0].patient_name).trim();
    }
  } catch (e) {
    Logger.log("[findNameFromReservationsTable_] Error: " + e.message);
  }

  return "";
}

/**
 * 問診マスターシートからpatient_idで患者情報を取得
 * @param {SpreadsheetApp.Spreadsheet} ss - スプレッドシート
 * @param {string} patientId - Patient ID
 * @return {Object|null} - 患者情報オブジェクト（name, sex, birth, tel, name_kana）または null
 */
function findPatientInfoFromMaster_(ss, patientId) {
  const SHEET_NAME_MASTER = "問診マスター";
  const sh = ss.getSheetByName(SHEET_NAME_MASTER);
  if (!sh) {
    Logger.log("[findPatientInfoFromMaster_] Sheet not found: " + SHEET_NAME_MASTER);
    return null;
  }

  const lastRow = sh.getLastRow();
  if (lastRow < 2) {
    Logger.log("[findPatientInfoFromMaster_] No data in master sheet");
    return null;
  }

  // 問診マスター列構成：E=氏名, F=性別, H=生年月日, I=電話番号, K=カナ, L=Patient_ID
  const COL_NAME = 5;  // E
  const COL_SEX = 6;   // F
  const COL_BIRTH = 8; // H
  const COL_TEL = 9;   // I
  const COL_KANA = 11; // K
  const COL_PID = 12;  // L

  const values = sh.getRange(2, 1, lastRow - 1, 15).getValues(); // A-O列まで読む

  // 最新行優先で検索
  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const pid = String(row[COL_PID - 1] || "").trim();
    if (pid !== String(patientId).trim()) continue;

    const name = String(row[COL_NAME - 1] || "").trim();
    const sex = String(row[COL_SEX - 1] || "").trim();
    const birth = row[COL_BIRTH - 1]; // Date型の可能性あり
    const tel = String(row[COL_TEL - 1] || "").trim();
    const nameKana = String(row[COL_KANA - 1] || "").trim();

    if (name) {
      // birthをISO文字列に変換
      let birthStr = "";
      if (birth) {
        try {
          if (birth instanceof Date) {
            birthStr = birth.toISOString();
          } else {
            birthStr = new Date(birth).toISOString();
          }
        } catch (e) {
          birthStr = String(birth);
        }
      }

      return {
        name: name,
        sex: sex,
        birth: birthStr,
        tel: tel,
        name_kana: nameKana
      };
    }
  }

  Logger.log("[findPatientInfoFromMaster_] No patient info found for patient_id=" + patientId);
  return null;
}

// ★ テスト関数：Supabase更新の動作確認
function testSupabaseUpdate() {
  Logger.log("=== Testing Supabase Update ===");

  try {
    updateSupabaseIntakeReservation_(
      "resv-test-12345",
      "20251200128",
      "2026-01-30",
      "16:00"
    );
    Logger.log("=== Test completed ===");
  } catch (e) {
    Logger.log("=== Test FAILED: " + e + " ===");
    Logger.log("Stack: " + e.stack);
  }
}

/**
 * 予約データをSupabaseのreservationsテーブルに書き込む（upsert）
 * @param {Object} data - { reserve_id, patient_id, patient_name, reserved_date, reserved_time, status, note, prescription_menu }
 */
function writeToSupabaseReservation_(data) {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return;
  }

  const url = supabaseUrl + "/rest/v1/reservations";

  try {
    const payload = {
      reserve_id: data.reserve_id || "",
      patient_id: data.patient_id || "",
      patient_name: data.patient_name || null,
      reserved_date: data.reserved_date || null,
      reserved_time: data.reserved_time || null,
      status: data.status || "pending",
      note: data.note || null,
      prescription_menu: data.prescription_menu || null
    };

    const res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey,
        "Prefer": "resolution=merge-duplicates"  // upsert
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    const body = res.getContentText();

    if (code >= 200 && code < 300) {
      Logger.log("[Supabase] reservation written: reserve_id=" + data.reserve_id);
    } else {
      Logger.log("[Supabase] reservation write failed: code=" + code + " body=" + body);
    }
  } catch (e) {
    Logger.log("[Supabase] reservation write error: " + e);
  }
}

/**
 * Vercelキャッシュを無効化
 * @param {string} patientId - Patient ID
 */
function invalidateVercelCache_(patientId) {
  if (!patientId) return;

  const props = PropertiesService.getScriptProperties();
  const vercelUrl = props.getProperty("VERCEL_URL");
  const adminToken = props.getProperty("ADMIN_TOKEN");

  if (!vercelUrl || !adminToken) {
    Logger.log("[invalidateCache] Missing VERCEL_URL or ADMIN_TOKEN");
    return;
  }

  const url = vercelUrl + "/api/admin/invalidate-cache";

  try {
    const res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + adminToken },
      payload: JSON.stringify({ patient_id: patientId }),
      muteHttpExceptions: true,
    });

    const code = res.getResponseCode();
    const body = res.getContentText();

    Logger.log("[invalidateCache] pid=" + patientId + " code=" + code + " body=" + body);

    if (code >= 200 && code < 300) {
      Logger.log("[invalidateCache] Success for patient_id=" + patientId);
    } else {
      Logger.log("[invalidateCache] Failed for patient_id=" + patientId + " code=" + code);
    }
  } catch (e) {
    Logger.log("[invalidateCache] Error for patient_id=" + patientId + ": " + e);
  }
}

function normPid_(v) {
  if (v === null || v === undefined) return "";
  var s = String(v).trim();
  if (s.endsWith(".0")) s = s.slice(0, -2);
  s = s.replace(/\s+/g, "");
  return s;
}

