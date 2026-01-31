// 90_reschedule_v2.gs

function pingHealth() {
  return { ok: true, ts: new Date().toISOString(), scriptId: ScriptApp.getScriptId() };
}

function healthCheck() {
  return {
    scriptId: ScriptApp.getScriptId(),
    pingHealth: typeof pingHealth,
    adminSearchPatientsByName: typeof adminSearchPatientsByName,
    adminResetReservationByPatientId: typeof adminResetReservationByPatientId,
    openRescheduleResetModal: typeof openRescheduleResetModal,
  };
}

// UIから呼ぶ（公開）
function openRescheduleResetModal() {
  const html = HtmlService.createHtmlOutputFromFile("reschedule_reset_modal")
    .setWidth(900)
    .setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(
    html,
    "予約取り直し（" + ScriptApp.getScriptId() + "）"
  );
}

// 内部
function _normNameKey_(s) {
  return String(s || "").replace(/[\s\u3000]+/g, "").toLowerCase();
}

// ===== 公開（HTMLから呼ぶ）=====
function adminSearchPatientsByName(query) {
  const q = _normNameKey_(query);
  if (!q) return { ok: true, items: [] };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const master  = ss.getSheetByName(SHEET_NAME_MASTER);
  const intake  = ss.getSheetByName(SHEET_NAME_INTAKE);
  const reserve = ss.getSheetByName(SHEET_NAME_RESERVE);
  if (!master) return { ok: false, error: "master_sheet_not_found" };

  const mLast = master.getLastRow();
  if (mLast < 2) return { ok: true, items: [] };

  const mVals = master.getRange(2, 1, mLast - 1, 12).getDisplayValues();
  const IDX_ANSWERER_ID = 2; // C
  const IDX_NAME = 4;        // E
  const IDX_PID = 11;        // L

  const candidates = [];
  const pidSet = new Set();

  for (let i = mVals.length - 1; i >= 0; i--) {
    const name = String(mVals[i][IDX_NAME] || "").trim();
    const pid  = String(mVals[i][IDX_PID]  || "").trim();
    const answererId = String(mVals[i][IDX_ANSWERER_ID] || "").trim();
    if (!name || !pid) continue;

    if (_normNameKey_(name).includes(q)) {
      if (!pidSet.has(pid)) {
        pidSet.add(pid);
        candidates.push({ name, answerer_id: answererId, patient_id: pid });
        if (candidates.length >= 50) break;
      }
    }
  }

  if (candidates.length === 0) return { ok: true, items: [] };

  // intake: A〜AA(27) から pid一致の最新を拾う
  const intakeMap = new Map();
  if (intake) {
    const iLast = intake.getLastRow();
    if (iLast >= 2) {
      const iVals = intake.getRange(2, 1, iLast - 1, 27).getDisplayValues();
      for (let i = iVals.length - 1; i >= 0; i--) {
        const pid = String(iVals[i][COL_PATIENT_ID_INTAKE - 1] || "").trim(); // Z
        if (!pid || !pidSet.has(pid)) continue;
        if (intakeMap.has(pid)) continue;

        intakeMap.set(pid, {
          reserveId: String(iVals[i][COL_RESERVE_ID_INTAKE - 1] || "").trim(), // B
          date: String(iVals[i][7] || "").trim(), // H
          time: String(iVals[i][8] || "").trim(), // I
        });
      }
    }
  }

  // reserve: A〜G(7) から pid一致の「キャンセル以外」最新を拾う
  const reserveMap = new Map();
  if (reserve) {
    const rLast = reserve.getLastRow();
    if (rLast >= 2) {
      const rVals = reserve.getRange(2, 1, rLast - 1, 7).getDisplayValues();
      for (let i = rVals.length - 1; i >= 0; i--) {
        const pid = String(rVals[i][2] || "").trim();    // C
        const status = String(rVals[i][6] || "").trim(); // G
        if (!pid || !pidSet.has(pid)) continue;
        if (status === "キャンセル") continue;
        if (reserveMap.has(pid)) continue;

        reserveMap.set(pid, {
          reserveId: String(rVals[i][1] || "").trim(), // B
          date: String(rVals[i][4] || "").trim(),      // E
          time: String(rVals[i][5] || "").trim(),      // F
          status,
        });
      }
    }
  }

  const items = candidates.map((c) => {
    const i = intakeMap.get(c.patient_id) || { reserveId: "", date: "", time: "" };
    const r = reserveMap.get(c.patient_id) || { reserveId: "", date: "", time: "", status: "" };
    return {
      name: c.name,
      answerer_id: c.answerer_id,
      patient_id: c.patient_id,
      intake_reserveId: i.reserveId,
      intake_reserved_date: i.date,
      intake_reserved_time: i.time,
      current_reserveId: r.reserveId,
      current_date: r.date,
      current_time: r.time,
      current_status: r.status,
    };
  });

  return { ok: true, items };
}

// ===== 公開（HTMLから呼ぶ）=====
// ①: ts / message を返す
function adminResetReservationByPatientId(patientId, reason) {
  const pid = String(patientId || "").trim();
  if (!pid) return { ok: false, error: "patient_id_required" };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const intake  = ss.getSheetByName(SHEET_NAME_INTAKE);
  const reserve = ss.getSheetByName(SHEET_NAME_RESERVE);

  if (!intake)  return { ok: false, error: "intake_sheet_not_found" };
  if (!reserve) return { ok: false, error: "reserve_sheet_not_found" };

  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    // 1) reserve: pid一致の有効予約をキャンセル
    let canceled = 0;
    const rVals = reserve.getDataRange().getValues();
    for (let i = 1; i < rVals.length; i++) {
      const rowPid = String(rVals[i][2] || "").trim(); // C
      const status = String(rVals[i][6] || "").trim(); // G
      if (rowPid !== pid) continue;
      if (status === "キャンセル") continue;
      reserve.getRange(i + 1, 7).setValue("キャンセル");
      canceled++;
    }

    // 2) intake: pid一致の最新1行の B/H/I と不通をクリア
    let cleared = 0;
    const iLast = intake.getLastRow();
    if (iLast >= 2) {
      const cols = Math.max(34, intake.getLastColumn());
      const iVals = intake.getRange(2, 1, iLast - 1, cols).getValues();
      for (let i = iVals.length - 1; i >= 0; i--) {
        const rowPid = String(iVals[i][COL_PATIENT_ID_INTAKE - 1] || "").trim(); // Z
        if (rowPid !== pid) continue;

        const rowNum = i + 2;
        intake.getRange(rowNum, COL_RESERVE_ID_INTAKE).setValue("");     // B
        intake.getRange(rowNum, COL_RESERVED_DATE_INTAKE).setValue("");  // H
        intake.getRange(rowNum, COL_RESERVED_TIME_INTAKE).setValue("");  // I
        intake.getRange(rowNum, COL_CALL_STATUS_INTAKE).setValue("");    // AE
        intake.getRange(rowNum, COL_CALL_STATUS_AT_INTAKE).setValue(""); // AF
        cleared++;

        // ★ Supabaseにも予約情報クリアを反映
        try {
          updateSupabaseIntakeReservation_(null, pid, null, null);
          Logger.log("[Reschedule] Supabase intake updated for patient_id=" + pid);
        } catch (e) {
          Logger.log("[Reschedule] Supabase intake update failed: " + e);
        }

        // ★ reservationsテーブルの予約もキャンセルに変更
        try {
          cancelSupabaseReservationsByPatientId_(pid);
          Logger.log("[Reschedule] Supabase reservations canceled for patient_id=" + pid);
        } catch (e) {
          Logger.log("[Reschedule] Supabase reservations cancel failed: " + e);
        }

        // ★ Vercelキャッシュも無効化
        try {
          invalidateVercelCache_(pid);
          Logger.log("[Reschedule] Cache invalidated for patient_id=" + pid);
        } catch (e) {
          Logger.log("[Reschedule] Cache invalidation failed: " + e);
        }

        break;
      }
    }

    const ts = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
    const message = `完了：予約キャンセル ${canceled} 件 / 問診クリア ${cleared} 件`;

    return {
      ok: true,
      patient_id: pid,
      canceled,
      cleared,
      reason: String(reason || ""),
      ts,
      message,
    };
  } finally {
    lock.releaseLock();
  }
}
