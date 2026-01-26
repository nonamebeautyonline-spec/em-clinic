/**
 * Karte Search API (Standalone GAS)
 * - READ ONLY
 * - 問診ブック「問診」
 * - Square webhook「のなめマスター」
 */

const MAX_CANDIDATES = 30;
const MAX_INTAKES   = 20;
const MAX_KARTE     = 50;
const MAX_HISTORY   = 50;

// =====================
// Web entry
// =====================
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) ? e.postData.contents : "{}");
    authorize_(body.apiKey);

    const type = String(body.type || "").trim();
    if (!type) {
      return json_({ ok: false, message: "missing_type" });
    }

    if (type === "searchPatients") {
      return json_({ ok: true, candidates: searchPatients_(body.q || "") });
    }

    if (type === "getPatientBundle") {
      return json_({ ok: true, ...getPatientBundle_(body) });
    }

    // ★ 追加：doctor_note を更新（保存時刻を自動スタンプ）
    if (type === "updateDoctorNote") {
      const patientId = String(body.patientId || "").trim();
      const note = String(body.note ?? "");

      if (!patientId) {
        return json_({ ok: false, message: "patientId_required" });
      }

      const result = updateDoctorNote_(patientId, note);
      return json_({ ok: true, ...result }); // { editedAt }
    }

    return json_({ ok: false, message: "unknown_type", type });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.stack ? err.stack : err) });
  }
}


// =====================
// 検索：氏名 → 候補
// =====================
function searchPatients_(q) {
  if (!q) return [];

  const ss = SpreadsheetApp.openById(prop_("INTAKE_SHEET_ID"));
  const sh = ss.getSheetByName(prop_("INTAKE_SHEET_NAME"));
  const v = sh.getDataRange().getValues();
  const h = headerMap_(v[0]);

  const out = new Map();
  const ql = q.toLowerCase();

  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    const name = r[h.name];
    if (!name || !String(name).toLowerCase().includes(ql)) continue;

    const pid = String(r[h.patient_id] || "").trim();
    const tel = normalizePhone_(r[h.tel] || r[h.master_I_tel] || r[h.master_J_tel]);
    const ts  = r[h.submittedAt] || r[h.timestamp];

    const key = pid || `${name}__${tel}`;
    const prev = out.get(key);
    const t = toTime_(ts);

    if (!prev || t > prev._t) {
      out.set(key, {
        patientId: pid,
        fallbackKey: pid ? "" : key,
        name: String(name),
        phone: tel,
        lastSubmittedAt: ts,
        _t: t
      });
    }
  }

  return Array.from(out.values())
    .sort((a,b)=>b._t-a._t)
    .slice(0, MAX_CANDIDATES)
    .map(({_t,...x})=>x);
}

// =====================
// 束ね取得
// =====================
function getPatientBundle_({ patientId, fallbackKey }) {
  const intake = fetchIntake_(patientId, fallbackKey);
  const history = fetchHistory_(patientId, intake.patient?.name, intake.patient?.phone);

  return {
    patient: intake.patient,
    intakes: intake.intakes,
    karteNotes: intake.karteNotes,
    history
  };
}

function fetchIntake_(patientId, fallbackKey) {
  const ss = SpreadsheetApp.openById(prop_("INTAKE_SHEET_ID"));
  const sh = ss.getSheetByName(prop_("INTAKE_SHEET_NAME"));
  const v = sh.getDataRange().getValues();
  const h = headerMap_(v[0]);

  const rows = [];

  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    const pid = String(r[h.patient_id] || "");
    const tel = normalizePhone_(r[h.tel] || r[h.master_I_tel] || r[h.master_J_tel]);
    const fb  = `${r[h.name]}__${tel}`;

    if (
      (patientId && pid === patientId) ||
      (!patientId && fallbackKey && fb === fallbackKey)
    ) {
      const rec = {};
      v[0].forEach((k,idx)=>rec[k]=r[idx]);
      rows.push({
        submittedAt: r[h.submittedAt] || r[h.timestamp],
        doctorNote: r[h.doctor_note],
        record: rec
      });
    }
  }

  rows.sort((a,b)=>toTime_(b.submittedAt)-toTime_(a.submittedAt));

  return {
    patient: rows[0]
      ? {
          id: patientId || "",
          name: rows[0].record.name,
          phone: normalizePhone_(rows[0].record.tel)
        }
      : null,
    intakes: rows.slice(0, MAX_INTAKES),
    karteNotes: rows
      .filter(r=>r.doctorNote)
      .slice(0, MAX_KARTE)
      .map(r=>({ at: r.submittedAt, text: r.doctorNote }))
  };
}

function fetchHistory_(patientId, name, phone) {
  const ss = SpreadsheetApp.openById(prop_("NONAME_MASTER_SHEET_ID"));
  const sh = ss.getSheetByName(prop_("NONAME_MASTER_SHEET_NAME"));
  const v = sh.getDataRange().getValues();
  const h = headerMap_(v[0]);

  const out = [];

  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (patientId && String(r[h.patient_id]) !== patientId) continue;

    out.push({
      paidAt: r[h.order_datetime],
      productName: r[h["Product Name"]] || r[h.items],
      amount: Number(r[h.amount] || 0),
      paymentId: r[h.payment_id]
    });
  }

  return out.slice(0, MAX_HISTORY);
}

// =====================
// Utilities
// =====================
function prop_(k) {
  return PropertiesService.getScriptProperties().getProperty(k);
}

function authorize_(key) {
  if (key !== prop_("KARTE_API_KEY")) throw new Error("unauthorized");
}

function headerMap_(header) {
  const map = {};
  header.forEach((k,i)=>map[k]=i);
  return map;
}

function normalizePhone_(v) {
  if (!v) return "";
  let s = String(v).replace(/[^\d]/g,"");
  if (s.startsWith("81")) s = "0"+s.slice(2);
  if (s.startsWith("90")) s = "0"+s;
  if (s.startsWith("80")) s = "0"+s;
  if (s.startsWith("70")) s = "0"+s;
  return s;
}

function toTime_(v) {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  const t = new Date(v).getTime();
  return isNaN(t)?0:t;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateDoctorNote_(patientId, noteRaw) {
  const editedAt = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");

  const ss = SpreadsheetApp.openById(prop_("INTAKE_SHEET_ID"));
  const sh = ss.getSheetByName(prop_("INTAKE_SHEET_NAME"));
  const values = sh.getDataRange().getValues();
  if (values.length < 2) throw new Error("intake_empty");

  const headers = values[0];
  const h = headerMap_(headers);

  // 必須列
  const pidCol = h["patient_id"];
  const submittedCol = h["submittedAt"];
  const tsCol = h["timestamp"];
  const noteCol = h["doctor_note"];

  if (pidCol == null || noteCol == null) throw new Error("missing_columns: patient_id/doctor_note");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // 最新行を探す
    let bestRow = -1;
    let bestT = 0;

    for (let i = 1; i < values.length; i++) {
      const r = values[i];
      if (String(r[pidCol] || "").trim() !== patientId) continue;

      const tVal = (submittedCol != null ? r[submittedCol] : null) || (tsCol != null ? r[tsCol] : null);
      const t = toTime_(tVal);
      if (t >= bestT) {
        bestT = t;
        bestRow = i; // 0-based in values
      }
    }

    if (bestRow < 1) throw new Error("patient_not_found_in_intake");

    const stamped = applyStamp_(noteRaw, editedAt);

    // シート行番号（1-based）
    const sheetRow = bestRow + 1;
    const sheetCol = noteCol + 1;

    sh.getRange(sheetRow, sheetCol).setValue(stamped);

    return { editedAt };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 先頭の「最終更新: 」スタンプを更新し、本文を保持する
 */
function applyStamp_(noteRaw, editedAt) {
  const body = String(noteRaw ?? "").replace(/\r\n/g, "\n").trim();
  // 既存の先頭スタンプ（1行目が「最終更新:」）があれば除去
  const lines = body.split("\n");
  if (lines.length && /^最終更新:\s*\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}/.test(lines[0])) {
    lines.shift();
  }
  const cleaned = lines.join("\n").trim();
  return `最終更新: ${editedAt}\n${cleaned}`.trim();
}
