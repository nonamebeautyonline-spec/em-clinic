// =====================
// 共通設定（問診ブック側）
// =====================

// このブックのスプレッドシートID
// ＝「問診」「予約」「問診マスター」が入っているブック
const SPREADSHEET_ID = "1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo";

// シート名
const SHEET_NAME_INTAKE  = "問診";
const SHEET_NAME_RESERVE = "予約";
const SHEET_NAME_MASTER  = "問診マスター";

// 問診で受け取るキー（J〜S 列）
const ANSWER_KEYS = [
  "ng_check",
  "current_disease_yesno",
  "current_disease_detail",
  "glp_history",
  "med_yesno",
  "med_detail",
  "allergy_yesno",
  "allergy_detail",
  "entry_route",
  "entry_other",
];

// 「問診」シートの列番号（1始まり）
// 問診シート（予約情報）
const COL_RESERVED_DATE_INTAKE = 8; // H: reserved_date
const COL_RESERVED_TIME_INTAKE = 9; // I: reserved_time

const COL_RESERVE_ID_INTAKE = 2;   // B: reserveId
const COL_STATUS_INTAKE     = 20;  // T: status
const COL_NOTE_INTAKE       = 21;  // U: doctor_note
const COL_MENU_INTAKE       = 22;  // V: prescription_menu
const COL_PATIENT_ID_INTAKE = 26;  // Z: patient_id

const COL_CALL_STATUS_INTAKE     = 31; // AE: call_status
const COL_CALL_STATUS_AT_INTAKE  = 32; // AF: call_status_updated_at
// 問診シート 追加列（1始まり）
const COL_VERIFIED_PHONE_INTAKE = 33; // AG
const COL_VERIFIED_AT_INTAKE    = 34; // AH
// 問診マスター 追加列（1始まり）
const COL_VERIFIED_PHONE_MASTER = 13; // M
const COL_VERIFIED_AT_MASTER    = 14; // N
const COL_LINE_USER_ID_MASTER = 15; // O

// タイムゾーン
const TZ = "Asia/Tokyo";

// =====================
// Product Code → 表示名マスタ（処方履歴用）
// =====================

const PRODUCT_LABELS = {
  "MJL_2.5mg_1m": "マンジャロ 2.5mg 1ヶ月",
  "MJL_2.5mg_2m": "マンジャロ 2.5mg 2ヶ月",
  "MJL_2.5mg_3m": "マンジャロ 2.5mg 3ヶ月",
  "MJL_5mg_1m":   "マンジャロ 5mg 1ヶ月",
  "MJL_5mg_2m":   "マンジャロ 5mg 2ヶ月",
  "MJL_5mg_3m":   "マンジャロ 5mg 3ヶ月",
  "MJL_7.5mg_1m": "マンジャロ 7.5mg 1ヶ月",
  "MJL_7.5mg_2m": "マンジャロ 7.5mg 2ヶ月",
  "MJL_7.5mg_3m": "マンジャロ 7.5mg 3ヶ月"
};

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  // 📅 予約取り直し（Lステ対応）
  ui.createMenu("📅 予約取り直し")
    .addItem("氏名検索 → 予約をまっさらにする", "openRescheduleResetModal")
    .addToUi();

  // ここに既存メニューがある場合は、同様に追記して統合する
  // 例：
  // ui.createMenu("🩺 問診")
  //   .addItem("問診マスター同期", "syncQuestionnaireFromMaster")
  //   .addToUi();
}
function headerIndexMap_(sheet) {
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  for (let i = 0; i < header.length; i++) {
    const k = String(header[i] || "").trim();
    if (k) map[k] = i + 1; // 1-based
  }
  return map;
}

function findRowsByExactMatch_(sheet, col1based, value) {
  if (!sheet || !col1based) return [];
  const v = String(value || "").trim();
  if (!v) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rng = sheet.getRange(2, col1based, lastRow - 1, 1);
  const hits = rng.createTextFinder(v).matchEntireCell(true).findAll();
  if (!hits || hits.length === 0) return [];

  const rows = hits.map(h => h.getRow());
  rows.sort((a, b) => a - b);
  return rows;
}
function findNonameShippingByPaymentId_(msheet, paymentId) {
  if (!msheet || !paymentId) return null;

  const pay = String(paymentId).trim();
  if (!pay) return null;

  const lastRow = msheet.getLastRow();
  if (lastRow < 2) return null;

  // Q列=payment_id（1-based 17）
  const COL_PAYMENT_ID = 17;

  const rng = msheet.getRange(2, COL_PAYMENT_ID, lastRow - 1, 1);
  const cell = rng.createTextFinder(pay).matchEntireCell(true).findNext();
  if (!cell) return null;

  const r = cell.getRow();

  // T:shipping_status(20), U:shipping_date(21), V:tracking_number(22) ※1-based
  const shipStatus = String(msheet.getRange(r, 20).getValue() || "").trim(); // T
  const shipDateV  = msheet.getRange(r, 21).getValue(); // U
  const tracking   = String(msheet.getRange(r, 22).getValue() || "").trim(); // V

  let shipDateStr = "";
  if (shipDateV instanceof Date) {
    shipDateStr = Utilities.formatDate(shipDateV, "Asia/Tokyo", "yyyy-MM-dd");
  } else if (shipDateV) {
    shipDateStr = String(shipDateV).trim();
  }

  return {
    tracking_number: tracking,
    shipping_status: shipStatus,
    shipping_date: shipDateStr,
  };
}
function groupContiguousRows_(rows) {
  if (!rows || rows.length === 0) return [];
  rows.sort((a,b)=>a-b);
  const groups = [];
  let s = rows[0], prev = rows[0];
  for (let i=1;i<rows.length;i++){
    const r = rows[i];
    if (r === prev + 1) { prev = r; continue; }
    groups.push([s, prev]);
    s = r; prev = r;
  }
  groups.push([s, prev]);
  return groups;
}

// =====================
// 共通ユーティリティ
// =====================

// Date or 値 → "yyyy-MM-dd"
function fmtDate(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, TZ, "yyyy-MM-dd");
  }
  return v ? String(v) : "";
}

// Date or 値 → "HH:mm"
function fmtTime(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, TZ, "HH:mm");
  }
  return v ? String(v) : "";
}

function pickNextReservationFromReserveSheet_(reserveSheet, patientKey, now, graceMinutes) {
  if (!reserveSheet || !patientKey) return null;

  const values = reserveSheet.getDataRange().getValues();
  if (values.length <= 1) return null;

  const graceMs = Number(graceMinutes || 0) * 60 * 1000;
  const slotMs = 15 * 60 * 1000; // 15分枠

  let best = null;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const reserveId = String(row[1] || "").trim(); // B
    const rowPid    = String(row[2] || "").trim(); // C
    const dateRaw   = row[4];                      // E
    const timeRaw   = row[5];                      // F
    const statusRaw = String(row[6] || "").trim(); // G

    if (!reserveId || rowPid !== patientKey) continue;
    if (statusRaw === "キャンセル") continue;

    const dStr = fmtDate(dateRaw);
    const tStr = fmtTime(timeRaw);
    if (!dStr || !tStr) continue;

    const start = new Date(dStr + "T" + tStr + ":00+09:00");
    if (isNaN(start.getTime())) continue;

    const end = new Date(start.getTime() + slotMs);
    const visibleUntil = new Date(end.getTime() + graceMs);

    // 枠終了+猶予を過ぎたら表示しない
    if (now.getTime() > visibleUntil.getTime()) continue;

    const isOngoing = now.getTime() >= start.getTime() && now.getTime() <= visibleUntil.getTime();

    const cand = {
      id: reserveId,
      datetime: start.toISOString(),
      title: "オンライン診察予約",
      status: "scheduled",
      _startMs: start.getTime(),
      _ongoing: isOngoing ? 1 : 0,
    };

    if (!best) {
      best = cand;
      continue;
    }

    // 進行中を優先
    if (cand._ongoing > best._ongoing) {
      best = cand;
      continue;
    }
    if (cand._ongoing < best._ongoing) continue;

    // 同カテゴリなら開始が近い方
    if (cand._startMs < best._startMs) best = cand;
  }

  if (!best) return null;
  return { id: best.id, datetime: best.datetime, title: best.title, status: best.status };
}

// UTC / JST の Date を "yyyy/MM/dd HH:mm:ss" 形式にそろえる
function _formatDateTimeJst(date) {
  if (!date) return "";

  var d;
  if (date instanceof Date) {
    d = date;
  } else {
    // 文字列なども一応 Date にしてみる
    d = new Date(date);
  }

  if (Object.prototype.toString.call(d) !== "[object Date]" || isNaN(d)) {
    return "";
  }

  return Utilities.formatDate(d, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
}

// 生年月日を "yyyy-MM-dd" に揃える
function normalizeBirth(v) {
  if (!v) return "";
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  var d = new Date(v);
  if (isNaN(d)) return String(v);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

// 電話番号：数字だけ＋先頭0を削った版も返す
function normalizeTel(v) {
  var digits = String(v || "").replace(/[^0-9]/g, "");
  var noHeadZero = digits.replace(/^0+/, "");
  return { digits: digits, noHeadZero: noHeadZero };
}

// 電話番号比較用キー：末尾10桁だけ見る（+81／0始まりの差を吸収）
function normalizePhoneKey(v) {
  var digits = String(v || "").replace(/[^0-9]/g, "");
  return digits.slice(-10); // 右10桁
}

// 携帯番号チェック（070/080/090）
// - 先頭0あり: 070/080/090 + 8桁（計11桁）
// - 先頭0なし: 70/80/90 + 8桁（計10桁）もOK
function isValidMobileTel_(raw) {
  const s = String(raw || "").trim();
  if (!s) return false;

  // 記号が入っている時点でNG（数字以外が1文字でもあれば）
  if (!/^[0-9]+$/.test(s)) return false;

  // 0あり（11桁）
  if (/^0(70|80|90)[0-9]{8}$/.test(s)) return true;

  // 0なし（10桁）: 例 8094739837
  if (/^(70|80|90)[0-9]{8}$/.test(s)) return true;

  return false;
}

// I/Jから「採用電話番号」を決める（表示用）
// 戻り値: { value: string, reason: string, mismatch: boolean }
function pickBestTel_(telI, telJ) {
  const i = String(telI || "").trim();
  const j = String(telJ || "").trim();

  const iOk = isValidMobileTel_(i);
  const jOk = isValidMobileTel_(j);

  // 両方無効
  if (!iOk && !jOk) {
    return { value: "要確認", reason: "both_invalid", mismatch: false };
  }

  // 不一致フラグ（両方有効なときだけ見れば十分）
  const mismatch = iOk && jOk && i !== j;

  // I優先
  if (iOk) return { value: i, reason: jOk ? "i_ok" : "i_ok_j_invalid", mismatch };
  return { value: j, reason: "j_ok", mismatch };
}



// JSONレスポンスを返すヘルパー
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// PIDから問診マスター（問診マスターシート）で氏名を引く
function findNameFromMasterByPid_(ss, patientId) {
  if (!patientId) return "";
  const sh = ss.getSheetByName(SHEET_NAME_MASTER);
  if (!sh) return "";

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return "";

  // A〜L（12列）
  const values = sh.getRange(2, 1, lastRow - 1, 12).getValues();

  const IDX_NAME = 4;  // E 氏名（0-based）
  const IDX_PID  = 11; // L Patient_ID（0-based）

  // 新しい行を優先（末尾から探索）
  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const pid = String(row[IDX_PID] || "").trim();
    if (pid !== String(patientId).trim()) continue;

    const name = String(row[IDX_NAME] || "").trim();
    if (name) return name;
  }
  return "";
}
// PIDから問診マスター（問診マスターシート）で line_user_id（O列）を引く
function findLineUserIdFromMasterByPid_(ss, patientId) {
  const pid = String(patientId || "").trim();
  if (!pid) return "";

  const sh = ss.getSheetByName(SHEET_NAME_MASTER);
  if (!sh) return "";

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return "";

  // L列（Patient_ID）で検索して、ヒット行の O列（line_user_id）を返す
  // ※ 同PIDが複数行ある可能性を考え、最後（最大row）を採用
  const pidRange = sh.getRange(2, 12, lastRow - 1, 1); // L列
  const finder = pidRange.createTextFinder(pid).matchEntireCell(true);
  const hits = finder.findAll();
  if (!hits || hits.length === 0) return "";

  let bestRow = -1;
  for (let i = 0; i < hits.length; i++) {
    const r = hits[i].getRow();
    if (r > bestRow) bestRow = r;
  }
  if (bestRow < 2) return "";

  const val = sh.getRange(bestRow, COL_LINE_USER_ID_MASTER).getDisplayValue(); // O列
  return String(val || "").trim();
}

// PIDから予約シート（予約タブ）で氏名を引く（保険）
function findNameFromReserveByPid_(ss, patientId) {
  if (!patientId) return "";
  const sh = ss.getSheetByName(SHEET_NAME_RESERVE);
  if (!sh) return "";

  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return "";

  // 予約シート想定: C=patient_id, D=name（0-based: 2,3）
  for (let i = values.length - 1; i >= 1; i--) {
    const row = values[i];
    const pid = String(row[2] || "").trim();
    if (pid !== String(patientId).trim()) continue;

    const name = String(row[3] || "").trim();
    if (name) return name;
  }
  return "";
}

function ensureIntakeVerifiedHeaders_(intakeSheet) {
  if (!intakeSheet) return;

  const needCols = COL_VERIFIED_AT_INTAKE; // AH=34
  const max = intakeSheet.getMaxColumns();
  if (max < needCols) {
    intakeSheet.insertColumnsAfter(max, needCols - max);
  }

  const hPhone = String(intakeSheet.getRange(1, COL_VERIFIED_PHONE_INTAKE).getValue() || "").trim();
  const hAt    = String(intakeSheet.getRange(1, COL_VERIFIED_AT_INTAKE).getValue() || "").trim();

  if (!hPhone) intakeSheet.getRange(1, COL_VERIFIED_PHONE_INTAKE).setValue("verified_phone");
  if (!hAt)    intakeSheet.getRange(1, COL_VERIFIED_AT_INTAKE).setValue("verified_at");
}

// phone を +81.. 形式に寄せる（GASに来る値は基本 +81想定だが保険）
function normalizeToE164JP_(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  // すでに +81... ならそれを整形
  if (s.startsWith("+")) return "+" + s.slice(1).replace(/[^0-9]/g, "");
  const digits = s.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "+81" + digits.slice(1);
  if (digits.startsWith("81")) return "+" + digits;
  return "+81" + digits;
}

function normalizeVerifiedPhoneToDomesticInMaster() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME_MASTER);
  if (!sh) throw new Error("問診マスターが見つかりません");

  sh.getRange("M:M").setNumberFormat("@"); // 文字列固定

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;

  const startRow = 2;
  const numRows = lastRow - 1;

  const vals = sh.getRange(startRow, COL_VERIFIED_PHONE_MASTER, numRows, 1).getDisplayValues();

  let changed = 0;
  for (let i = 0; i < vals.length; i++) {
    const raw = String(vals[i][0] || "").trim();
    if (!raw) continue;

    const norm = normalizeToDomesticJP_(raw);
    if (norm && norm !== raw) {
      vals[i][0] = norm;
      changed++;
    }
  }

  sh.getRange(startRow, COL_VERIFIED_PHONE_MASTER, numRows, 1).setValues(vals);
  Logger.log("normalizeVerifiedPhoneToDomesticInMaster changed=" + changed);
}

function normalizeToDomesticJP_(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";

  // 記号除去して数字だけ
  const digits = s.replace(/[^0-9]/g, "");
  if (!digits) return "";

  // +81/81始まり → 0始まりへ
  if (digits.startsWith("81") && digits.length >= 11) {
    return "0" + digits.slice(2);
  }

  // すでに国内（0始まり）
  if (digits.startsWith("0")) return digits;

  // それ以外はそのまま返す（必要なら要確認にしてもOK）
  return digits;
}


// 問診シートの該当行に verified_phone/verified_at を入れる（空欄のみ）
function setVerifiedPhoneToIntake_(intakeSheet, patientId, answererId, phoneRaw) {
  if (!intakeSheet) return;

  const pid = String(patientId || "").trim();
  const aid = String(answererId || "").trim();
  const phoneE164 = normalizeToE164JP_(phoneRaw);
  if (!phoneE164) return;

  const lastRow = intakeSheet.getLastRow();
  if (lastRow < 2) return;

  ensureIntakeVerifiedHeaders_(intakeSheet);

  // A〜AH まで読む（34列）※AG/AH を触るため
  const COLS = COL_VERIFIED_AT_INTAKE;
  const values = intakeSheet.getRange(2, 1, lastRow - 1, COLS).getValues();

  // 問診（0-based）
  const IDX_ANSWERERID = 24; // Y（0-based）
  const IDX_PID        = 25; // Z（0-based）
  const IDX_VER_PHONE  = COL_VERIFIED_PHONE_INTAKE - 1; // AG
  const IDX_VER_AT     = COL_VERIFIED_AT_INTAKE - 1;    // AH

  const nowStr = Utilities.formatDate(new Date(), TZ, "yyyy/MM/dd HH:mm:ss");

  let updated = 0;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];

    const rowPid = String(row[IDX_PID] || "").trim();
    const rowAid = String(row[IDX_ANSWERERID] || "").trim();

    // マッチ条件：PID一致を最優先。PIDがまだ入ってない段階に備えて answerer_id も許可
    const match = (pid && rowPid === pid) || (aid && rowAid === aid);
    if (!match) continue;

    const curPhone = String(row[IDX_VER_PHONE] || "").trim();
    if (curPhone) continue; // 既に入っているなら上書きしない

    row[IDX_VER_PHONE] = phoneE164;
    row[IDX_VER_AT]    = nowStr;
    updated++;
  }

  if (updated > 0) {
    intakeSheet.getRange(2, 1, values.length, COLS).setValues(values);
  }
}

function ensureMasterVerifiedHeaders_(masterSheet) {
  if (!masterSheet) return;

  const needCols = COL_VERIFIED_AT_MASTER; // N=14
  const max = masterSheet.getMaxColumns();
  if (max < needCols) {
    masterSheet.insertColumnsAfter(max, needCols - max);
  }

  const hPhone = String(masterSheet.getRange(1, COL_VERIFIED_PHONE_MASTER).getValue() || "").trim();
  const hAt    = String(masterSheet.getRange(1, COL_VERIFIED_AT_MASTER).getValue() || "").trim();

  if (!hPhone) masterSheet.getRange(1, COL_VERIFIED_PHONE_MASTER).setValue("verified_phone");
  if (!hAt)    masterSheet.getRange(1, COL_VERIFIED_AT_MASTER).setValue("verified_at");
}

function findVerifiedFromMasterByPid_(masterSheet, pid) {
  if (!masterSheet || !pid) return null;

  ensureMasterVerifiedHeaders_(masterSheet);

  const lastRow = masterSheet.getLastRow();
  if (lastRow < 2) return null;

  // A〜N（14列）
  const values = masterSheet.getRange(2, 1, lastRow - 1, COL_VERIFIED_AT_MASTER).getValues();

  const IDX_PID = 11; // L (0-based)
  const IDX_VPHONE = COL_VERIFIED_PHONE_MASTER - 1; // M (0-based)
  const IDX_VAT    = COL_VERIFIED_AT_MASTER - 1;    // N (0-based)

  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const rowPid = String(row[IDX_PID] || "").trim();
    if (rowPid !== String(pid).trim()) continue;

    const vPhone = String(row[IDX_VPHONE] || "").trim();
    const vAt    = String(row[IDX_VAT] || "").trim();
    if (!vPhone) return null;

    return { phone: vPhone, at: vAt };
  }

  return null;
}

// =====================
// 処方履歴（決済履歴）を history に追加（Square Webhook シート）
// =====================
//
// Script Properties で以下を設定しておく想定:
//  - WEBHOOK_SHEET_ID   : Square Webhook シートのスプレッドシートID
//  - WEBHOOK_SHEET_NAME : シート名（例: "Square Webhook"）
//
function appendOrderHistoryForPatient(history, patientId) {
  if (!patientId) return;

  const props = PropertiesService.getScriptProperties();
  const webhookSheetId   = props.getProperty("WEBHOOK_SHEET_ID");
  const webhookSheetName = props.getProperty("WEBHOOK_SHEET_NAME") || "Square Webhook";

  if (!webhookSheetId) return;

  let webhookSS, webhookSheet;
  try {
    webhookSS = SpreadsheetApp.openById(webhookSheetId);
    webhookSheet = webhookSS.getSheetByName(webhookSheetName);
  } catch (e) {
logErrorSafe_("appendOrderHistoryForPatient open webhook sheet", e);
    return;
  }
  if (!webhookSheet) return;

  const values = webhookSheet.getDataRange().getValues();
  if (values.length <= 1) return;

  // 想定ヘッダー：
  // A:order_datetime, G:items, H:amount, I:name（請求先）, J:payment_id,
  // K:product_code, L:patient_id
  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const rowPid      = String(row[11] || ""); // L列 patient_id (0-based index 11)
    if (!rowPid || rowPid !== patientId) continue;

    const orderDateRaw = row[0];               // A列 order_datetime
    const itemsText    = String(row[6] || ""); // G列 items ("マンジャロ 2.5mg 1ヶ月 x 1" など)
    const productCode  = String(row[10] || ""); // K列 product_code
    const amount       = Number(row[7] || 0);   // H列 amount
    const paymentId    = String(row[9] || "");  // J列 payment_id

    // 日付を ISO に揃える
    let iso = "";
    if (orderDateRaw instanceof Date) {
      const d = orderDateRaw;
      const y = d.getFullYear();
      const m = ("0" + (d.getMonth() + 1)).slice(-2);
      const day = ("0" + d.getDate()).slice(-2);
      const hh = ("0" + d.getHours()).slice(-2);
      const mm = ("0" + d.getMinutes()).slice(-2);
      const ss = ("0" + d.getSeconds()).slice(-2);
      iso = `${y}-${m}-${day}T${hh}:${mm}:${ss}+09:00`;
    } else if (orderDateRaw) {
      const s = String(orderDateRaw).replace(/\//g, "-");
      iso = s.includes("T") ? s : s.replace(" ", "T") + "+09:00";
    }

    // 表示名：
    //  1. itemsText（"マンジャロ 2.5mg 1ヶ月 x 1"）を優先
    //  2. なければ code→日本語マスタ
    //  3. それもなければ productCode そのまま
    const label =
      (itemsText && itemsText.trim()) ||
      PRODUCT_LABELS[productCode] ||
      productCode ||
      "";

    if (!label) continue;

    history.push({
      id: paymentId || `order-${i + 1}`,
      date: iso || "",
      title: "処方",      // 後でフロント側で「処方歴」フィルタに使う
      detail: label,     // ここに "マンジャロ 2.5mg 1ヶ月 x 1" が入る
      amount: amount,
    });
  }
}

function isDebugLogEnabled_() {
  try {
    return PropertiesService.getScriptProperties().getProperty("DEBUG_LOG") === "1";
  } catch (e) {
    return false;
  }
}

// PIIを書かない前提のログ（デバッグON時のみ）
function logSafe_(msg) {
  if (!isDebugLogEnabled_()) return;
  Logger.log(msg);
}

// 例外は message だけに制限（詳細は出さない）
function logErrorSafe_(context, err) {
  var m = "";
  try {
    m = (err && err.message) ? String(err.message) : String(err);
  } catch (e) {
    m = "unknown";
  }
  Logger.log("[ERR] " + context + " :: " + m);
}


// =====================
// ダッシュボード組み立て（マイページ用）
// =====================

function buildDashboardForLineId(ss, lineId, fallbackName) {
  const intakeSheet  = ss.getSheetByName(SHEET_NAME_INTAKE);
  const reserveSheet = ss.getSheetByName(SHEET_NAME_RESERVE);

  const now = new Date();

  // ---------- ① 問診シートから履歴（DR UI の「処方許可」＝診察終了） ----------
  const intakeValues = intakeSheet.getDataRange().getValues();
  const history = [];
  let displayName = fallbackName || "";

  if (intakeValues.length > 1 && lineId) {
    for (let i = 1; i < intakeValues.length; i++) {
      const row = intakeValues[i];

      const rowLineId = String(row[6] || ""); // G: line_id
      if (!rowLineId || rowLineId !== lineId) continue;

      const ts        = row[0];               // A: timestamp
      const reserveId = String(row[COL_RESERVE_ID_INTAKE - 1] || ""); // B: reserveId
      const name      = String(row[3] || ""); // D: name
      const reservedDateRaw = row[7];         // H: reserved_date
      const reservedTimeRaw = row[8];         // I: reserved_time
      const status    = String(row[COL_STATUS_INTAKE - 1] || ""); // T: status
      const menu      = String(row[COL_MENU_INTAKE - 1] || "");   // V: prescription_menu

      if (!displayName && name) {
        displayName = name;
      }

      const dateStr = fmtDate(reservedDateRaw || ts);
      const timeStr = fmtTime(reservedTimeRaw || ts);

      const iso =
        dateStr
          ? `${dateStr}T${timeStr || "00:00"}:00+09:00`
          : Utilities.formatDate(now, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");

      const baseTitle = menu || "診察・処方";
      const baseDetail = menu || "診察・処方";

      // ★ 診察済み判定：prescription_menu が入っている行を採用
      const hasPrescription = menu && menu.trim() !== "";

      if (hasPrescription) {
        history.push({
          id: reserveId || "intake-" + (i + 1),
          date: iso,
          title: baseTitle,
          detail: baseDetail,
        });
      }
    }

    history.sort(function (a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }

  // ---------- ② 予約シートから次回予約 ----------
  let nextReservation = null;

  if (lineId) {
    const reserveValues = reserveSheet.getDataRange().getValues();

    for (let i = 1; i < reserveValues.length; i++) {
      const row = reserveValues[i];
      const reserveId = String(row[1] || ""); // B: reserveId
      const rowLineId = String(row[2] || ""); // C: lineId or PatientID
      const dateRaw   = row[4];               // E: date
      const timeRaw   = row[5];               // F: time
      const statusRaw = String(row[6] || ""); // G: status

      if (!reserveId || !rowLineId || rowLineId !== lineId) continue;
      if (statusRaw === "キャンセル") continue;

      const dStr = fmtDate(dateRaw);
      const tStr = fmtTime(timeRaw);
      if (!dStr || !tStr) continue;

      const dt = new Date(dStr + "T" + tStr + ":00+09:00");
      if (dt.getTime() <= now.getTime()) continue;

      if (
        !nextReservation ||
        dt.getTime() < new Date(nextReservation.datetime).getTime()
      ) {
        nextReservation = {
          id: reserveId,
          datetime: dt.toISOString(),
          title: "オンライン診察予約",
          status: "scheduled",
        };
      }
    }
  }
  var historyAllCount = Array.isArray(history) ? history.length : 0;
var hasMoreHistory = historyAllCount > 5;
if (hasMoreHistory) {
  history = history.slice(0, 5);
}

  return {
    patient: {
      id: lineId || "",
      displayName: displayName || fallbackName || "",
      line_user_id: lineId || "", // ★追加（lineId=LINE IDならこれでOK）
    },
    nextReservation: nextReservation,
    activeOrders: [],
    history: history,
    hasMoreHistory: hasMoreHistory,
  };
}

// =====================
// patient_id ベースのダッシュボード（MyPage用）
// =====================
function buildDashboardForPatientId(ss, patientId, fallbackName, full) {
const t0 = new Date().getTime();
const perfLog = [];
const mark = (label) => perfLog.push([label, new Date().getTime() - t0]);


  // ここから既存のコード
  const intakeSheet  = ss.getSheetByName(SHEET_NAME_INTAKE);
  const reserveSheet = ss.getSheetByName(SHEET_NAME_RESERVE);
const hasIntake = hasSubmittedIntakeByPid_(intakeSheet, patientId); // ★追加
  const now = new Date();

// ---------- ① 問診シート：PID一致行だけ読む（フルスキャン禁止） ----------
const history = [];
let displayName = fallbackName || "";
let hasDoctorOk = false; // ★維持

if (intakeSheet && patientId) {
  // Z列(patient_id) で一致する行番号だけ取る
  const rows = findRowsByPidInIntake_(intakeSheet, patientId);

  // A〜AA(27列) まであれば、A/B/D/H/I/T/V/Z/AA が揃う
  const WIDTH = 27;

  for (let k = 0; k < rows.length; k++) {
    const r = rows[k];

    // 該当行だけ読む（全件読み禁止）
    const row = intakeSheet.getRange(r, 1, 1, WIDTH).getValues()[0];

    const ts        = row[0]; // A: timestamp
    const reserveId = String(row[COL_RESERVE_ID_INTAKE - 1] || ""); // B
    const name      = String(row[3] || ""); // D
    const reservedDateRaw = row[7]; // H
    const reservedTimeRaw = row[8]; // I
    const status    = String(row[COL_STATUS_INTAKE - 1] || ""); // T
    const menu      = String(row[COL_MENU_INTAKE - 1] || "");   // V

    if (String(status).trim().toUpperCase() === "OK") {
      hasDoctorOk = true;
    }

    if (!displayName && name) {
      displayName = name;
    }

    const dateStr = fmtDate(reservedDateRaw || ts);
    const timeStr = fmtTime(reservedTimeRaw || ts);

    const iso =
      dateStr
        ? `${dateStr}T${timeStr || "00:00"}:00+09:00`
        : Utilities.formatDate(now, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");

    const baseTitle  = menu || "診察・処方";
    const baseDetail = menu || "診察・処方";

    const hasPrescription = menu && String(menu).trim() !== "";
    if (hasPrescription) {
      history.push({
        id: reserveId || "intake-" + r, // ★ i+1 ではなく行番号を使う
        date: iso,
        title: baseTitle,
        detail: baseDetail,
      });
    }
  }

  // 従来通り：日付降順
  if (history.length > 0) {
    history.sort(function (a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }
  mark("A_intake_done");
}

// ---------- ② 予約シートから次回予約 ----------
let nextReservation = null;

// ★ 条件：診察履歴なし ＆ DrがOKにしていない
if (patientId && history.length === 0 && !hasDoctorOk) {
  const GRACE_MINUTES = 10; // ★ 15分枠 + 10分猶予
  nextReservation = pickNextReservationFromReserveSheet_(
    reserveSheet,
    String(patientId).trim(),
    now,
    GRACE_MINUTES
  );
}
mark("B_reserve_done");

  // ---------- ③ 注文情報（Square Webhook シート） ----------
var ordersInfo = loadOrdersForDashboard_(patientId, full);
  var orders = ordersInfo.orders || [];
  var flags  = ordersInfo.flags || {
    canPurchaseCurrentCourse: true,
    canApplyReorder: false,
    hasAnyPaidOrder: false,
  };
  // ★追加：orders内の詳細perfを上位perfに合流（Networkで見えるように）
if (ordersInfo && Array.isArray(ordersInfo._perf_orders)) {
  for (var pi = 0; pi < ordersInfo._perf_orders.length; pi++) {
    perfLog.push(ordersInfo._perf_orders[pi]);
  }
}

mark("C_orders_done");

  // ---------- ④ 再処方申請一覧 ----------
  var reorders = loadReordersForDashboard_(patientId);
mark("D_reorders_done");
// ===== 再処方状態を flags に反映 =====
if (Array.isArray(reorders) && reorders.length > 0) {
  const latest = reorders[0]; // 新しい順なら0番が最新
  const st = String(latest.status || "").toLowerCase();

  if (st === "pending") {
    flags.canApplyReorder = false;
  }

  if (st === "confirmed" || st === "approved") {
    flags.canApplyReorder = false;
    // フロントが ordersFlags で「決済可」を見ている場合の保険
    flags.canPurchaseCurrentCourse = true;
  }
}

    // ★ displayName が空なら、問診マスター→予約の順で補完
  if (!displayName) displayName = findNameFromMasterByPid_(ss, patientId);
  if (!displayName) displayName = findNameFromReserveByPid_(ss, patientId);
  if (!displayName) displayName = fallbackName || "";


  // ★ line_user_id を問診マスターから引く（無ければ空）
  const lineUserIdFromSheet = findLineUserIdFromMasterByPid_(ss, patientId);
mark("E_finalize_done");
// --- history preview: 最新5件 + hasMoreHistory ---
var historyAllCount = Array.isArray(history) ? history.length : 0;
var hasMoreHistory = historyAllCount > 5;
if (hasMoreHistory) {
  history = history.slice(0, 5);
}

  return {
    patient: {
      id: patientId || "",
      displayName: displayName || fallbackName || "",
      line_user_id: lineUserIdFromSheet || "", // ★追加
    },
    nextReservation: nextReservation,
    activeOrders: [],  // 互換用
    history: history,
      hasMoreHistory: hasMoreHistory, // ★追加（フロントで「すべて表示」を出す判断に使う）
    orders: orders,
    flags: flags,
      ordersFlags: flags, // ← これ重要
    reorders: reorders,
      // ★ 追加
  hasIntake: hasIntake,
perf: perfLog,
  };
}

// NOTE:
// この関数は「PID行の存在チェック」用。
// 問診完了判定（submittedAt基準）には使わないこと。
function findExistingIntakeIdByPid_(intakeSheet, pid) {
  if (!intakeSheet || !pid) return "";

  const lastRow = intakeSheet.getLastRow();
  if (lastRow < 2) return "";

  // A〜AA(27列)で十分：Z=patient_id, AA=intakeId
  const values = intakeSheet.getRange(2, 1, lastRow - 1, 27).getValues();

  const pidKey = String(pid).trim();
  const IDX_PID = 25;       // Z
  const IDX_INTAKE_ID = 26; // AA

  for (let i = values.length - 1; i >= 0; i--) {
    const rowPid = String(values[i][IDX_PID] || "").trim();
    if (rowPid !== pidKey) continue;

    const intakeId = String(values[i][IDX_INTAKE_ID] || "").trim();
    return intakeId || "exists"; // intakeIdが空でも「存在」は返したい
  }
  return "";
}
// submittedAt(C列) が入っている「提出済み問診」があるか（PID基準）
function findExistingSubmittedIntakeByPid_(intakeSheet, pid) {
  if (!intakeSheet || !pid) return "";

  const lastRow = intakeSheet.getLastRow();
  if (lastRow < 2) return "";

  // A〜AA(27列)で十分：C=submittedAt, Z=patient_id, AA=intakeId
  const values = intakeSheet.getRange(2, 1, lastRow - 1, 27).getValues();

  const pidKey = String(pid).trim();
  const IDX_SUBMITTED_AT = 2; // C（0-based）
  const IDX_PID = 25;         // Z（0-based）
  const IDX_INTAKE_ID = 26;   // AA（0-based）

  // 新しい行を優先（末尾から探索）
  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const rowPid = String(row[IDX_PID] || "").trim();
    if (rowPid !== pidKey) continue;

    const submittedAt = String(row[IDX_SUBMITTED_AT] || "").trim();
    if (!submittedAt) continue; // ★提出済みのみ

    const intakeId = String(row[IDX_INTAKE_ID] || "").trim();
    return intakeId || "submitted"; // intakeId空でも「提出済み」は返す
  }

  return "";
}
// Z列(patient_id)で完全一致する「全行番号」を返す
function findRowsByPidInIntake_(intakeSheet, pid) {
  if (!intakeSheet || !pid) return [];
  const pidKey = String(pid).trim();
  if (!pidKey) return [];

  const lastRow = intakeSheet.getLastRow();
  if (lastRow < 2) return [];

  const rng = intakeSheet.getRange(2, COL_PATIENT_ID_INTAKE, lastRow - 1, 1);
  const hits = rng.createTextFinder(pidKey).matchEntireCell(true).findAll();
  if (!hits || hits.length === 0) return [];

  const rows = hits.map(h => h.getRow());
  rows.sort((a, b) => a - b); // 昇順
  return rows;
}


// =====================
// doGet: ダッシュボード / Doctor UI 用一覧
// =====================

function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const type = e && e.parameter && e.parameter.type ? e.parameter.type : "";

// ★ PIDだけで「問診が1回でもあるか」を返す（最優先）
if (type === "hasIntakeByPid") {
  const pid = String(e.parameter.patient_id || "").trim();
  if (!pid) return jsonResponse({ ok: false, error: "bad_request" });

  const intakeSheet = ss.getSheetByName(SHEET_NAME_INTAKE);
  if (!intakeSheet) return jsonResponse({ ok: false, error: "intake_sheet_not_found" });

// ★ submittedAt 基準にする
const existing = findExistingSubmittedIntakeByPid_(intakeSheet, pid);

return jsonResponse({
  ok: true,
  exists: !!existing,
  // intakeId が空でも "submitted" が返るので、文字列として返すだけ
  intakeId: existing || "",
});
}

// ① マイページ用ダッシュボード
if (type === "getDashboard") {
  const pid    = String(e.parameter.patient_id || e.parameter.pid || "").trim();
  const lineId = String(e.parameter.lineId || e.parameter.customer_id || "").trim();
  const name   = String(e.parameter.name || "").trim();

  // ★追加：full=1 なら全件モード（ordersを多めに返す）
  const full = String(e.parameter.full || "").trim() === "1";

  try {
    const dashboard = pid
      ? buildDashboardForPatientId(ss, pid, name, full)  // ★第4引数追加
      : buildDashboardForLineId(ss, lineId, name);

    return ContentService.createTextOutput(JSON.stringify(dashboard))
      .setMimeType(ContentService.MimeType.JSON);


  } catch (err) {
    // ★重要：Nextが壊れないように「同じ形」で返す
    const msg = String(err && err.message ? err.message : err);
    Logger.log("[getDashboard_exception] " + msg);

    const fallback = {
      patient: { id: pid || lineId || "", displayName: name || "" },
      nextReservation: null,
      activeOrders: [],
      orders: [],
      flags: { canPurchaseCurrentCourse: true, canApplyReorder: false, hasAnyPaidOrder: false },
      reorders: [],
      history: [],
      perf: [["getDashboard_exception", 0]],
      __err: msg, // ★これがNetworkで見える（原因特定用）
    };

    return ContentService.createTextOutput(JSON.stringify(fallback))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

  // ② Doctor UI 用: 予約＋問診マージ一覧
  const intakeSheet  = ss.getSheetByName(SHEET_NAME_INTAKE);
  const reserveSheet = ss.getSheetByName(SHEET_NAME_RESERVE);

  if (!reserveSheet) {
    return jsonResponse([]);
  }

  const reserveValues = reserveSheet.getDataRange().getValues();
  if (reserveValues.length <= 1) {
    return jsonResponse([]);
  }

  const intakeValues = intakeSheet ? intakeSheet.getDataRange().getValues() : [];
  const intakeHeader = intakeValues.length > 0 ? intakeValues[0] : [];
  const intakeByReserveId = {};

  if (intakeValues.length > 1) {
    for (let i = 1; i < intakeValues.length; i++) {
      const row = intakeValues[i];
      const obj = {};

      intakeHeader.forEach(function (key, idx) {
        if (!key) return;
        obj[String(key)] = row[idx];
      });

      const rid =
        String(obj["reserveId"] || obj["reserved"] || obj["予約ID"] || obj["予約id"] || "");
      if (!rid) continue;

      if (obj["reserved_date"]) {
        obj["reserved_date"] = fmtDate(obj["reserved_date"]);
      }
      if (obj["reserved_time"]) {
        obj["reserved_time"] = fmtTime(obj["reserved_time"]);
      }

      intakeByReserveId[rid] = obj;
    }
  }

  const result = [];

  for (let i = 1; i < reserveValues.length; i++) {
    const row = reserveValues[i];

    const reserveId = String(row[1] || ""); // B: reserved (reserveId)
    if (!reserveId) continue;

    const patientIdFromReserve = String(row[2] || ""); // C: Patient_ID
    const nameReserve          = String(row[3] || ""); // D: name
    const dateRaw              = row[4];               // E: date
    const timeRaw              = row[5];               // F: time
    const reserveStatusRaw     = String(row[6] || ""); // G: status

    if (reserveStatusRaw === "キャンセル") {
      continue;
    }

    const reservedDate = fmtDate(dateRaw);
    const reservedTime = fmtTime(timeRaw);
    if (!reservedDate) continue;

    let merged = {};
    const intake = intakeByReserveId[reserveId];
    if (intake) {
      merged = Object.assign({}, intake);
    }

    if (!merged["reserveId"]) merged["reserveId"] = reserveId;
    merged["reserved"] = reserveId;

    merged["reserved_date"] = reservedDate;
    merged["reserved_time"] = reservedTime;

    merged["予約日"]   = merged["reserved_date"];
    merged["予約時間"] = merged["reserved_time"];

    if (!merged["name"]) merged["name"] = nameReserve;
    if (!merged["氏名"]) merged["氏名"] = merged["name"];

    if (patientIdFromReserve) {
      if (!merged["patient_id"]) merged["patient_id"] = patientIdFromReserve;
      if (!merged["Patient_ID"]) merged["Patient_ID"] = patientIdFromReserve;
    }

    merged["reserve_status"] = reserveStatusRaw;

    result.push(merged);
  }

  return jsonResponse(result);
}

// =====================
// doPost: doctor_update / intake / patient_link
// =====================

function doPost(e) {
  try {
    const raw = e.postData && e.postData.contents ? e.postData.contents : "{}";
    const body = JSON.parse(raw);
    const type = body.type || "";
        // ========= invalidate_cache（発送/追跡更新などの外部イベント用）=========
    if (type === "invalidate_cache") {
      const props = PropertiesService.getScriptProperties();
      const secret = String(props.getProperty("MYPAGE_INVALIDATE_SECRET") || "").trim();
      const got = String(body.secret || "").trim();

      // SECRET を設定している場合は一致必須
      if (secret && got !== secret) {
        return jsonResponse({ ok: false, error: "forbidden" });
      }

      try {
        const cache = CacheService.getScriptCache();
        cache.remove("pid_webhook_index_mirror_v1");
        cache.remove("pay_master_index_map_v1");
        cache.remove("shipping_index_map_v1");
        // NOTE: reorders_{pid} は患者ごとなので個別削除が必要
        // 現状はNext.js側のinvalidateDashboardCache()で対応
      } catch (e2) {}

      return jsonResponse({ ok: true });
    }


    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const intakeSheet = ss.getSheetByName(SHEET_NAME_INTAKE);
    const masterSheet = ss.getSheetByName(SHEET_NAME_MASTER);

    // ========= 0. phone だけで PID を返す（/api/register/complete 用） =========
// ========= 0. phone だけで PID を返す（/api/register/complete 用） =========
if (body.phone) {
  const phoneInputRaw = body.phone || "";
  const lineUserId = body.line_user_id || ""; // 今は空でもOK（将来紐付け用）

  if (!phoneInputRaw) {
    return jsonResponse({ ok: false, message: "phone_required" });
  }

  if (!masterSheet) {
    return jsonResponse({ ok: false, message: "sheet_not_found" });
  }

  const mLastRow = masterSheet.getLastRow();
  if (mLastRow < 2) {
    return jsonResponse({ ok: false, message: "no_data" });
  }

  // A〜L（15列）を読む
 const MASTER_COLS = Math.max(COL_LINE_USER_ID_MASTER, COL_VERIFIED_AT_MASTER); // 15
 const mValues = masterSheet.getRange(2, 1, mLastRow - 1, MASTER_COLS).getValues();  // 0-based index
  const IDX_ANSWERED_AT = 1; // B 回答日時
  const IDX_ANSWERER_ID = 2; // C 回答者ID（LステUserID的なもの）
  const IDX_NAME        = 4; // E 氏名
  const IDX_BIRTH       = 7; // H 生年月日（今は使わない）
  const IDX_TEL1        = 8; // I 電話番号
  const IDX_TEL2        = 9; // J 電話番号の再確認
  const IDX_PID         = 11; // L Patient_ID

  const inputKey = normalizePhoneKey(phoneInputRaw);

  // ★ 最新行（末尾）優先でヒットさせる
  let hitRowIndex = -1; // mValues内のindex（0-based）
  for (let i = mValues.length - 1; i >= 0; i--) {
    const row = mValues[i];
    const k1 = normalizePhoneKey(row[IDX_TEL1]);
    const k2 = normalizePhoneKey(row[IDX_TEL2]);
    if (inputKey && (inputKey === k1 || inputKey === k2)) {
      hitRowIndex = i;
      break;
    }
  }

  if (hitRowIndex === -1) {
    Logger.log("register_by_phone NO HIT");
    return jsonResponse({ ok: false, message: "not_found" });
  }

  // 実シート行番号（ヘッダーを考慮）
  const sheetRow = hitRowIndex + 2;

  // PIDが既にあればそれを返す
  const hitRow = mValues[hitRowIndex];
  const existingPid = String(hitRow[IDX_PID] || "").trim();
  const name = String(hitRow[IDX_NAME] || "").trim();
  const answererId = String(hitRow[IDX_ANSWERER_ID] || "").trim();

  // 排他でPIDを確定（重複防止）
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    // 競合対策：セルを再読込
    const pidCell = masterSheet.getRange(sheetRow, 12); // L列
    const againPid = String(pidCell.getValue() || "").trim();

if (againPid) {
  try {
    ensureMasterVerifiedHeaders_(masterSheet);
    const nowStr = Utilities.formatDate(new Date(), TZ, "yyyy/MM/dd HH:mm:ss");

    const cur = String(masterSheet.getRange(sheetRow, COL_VERIFIED_PHONE_MASTER).getValue() || "").trim();
    if (!cur) {
      masterSheet.getRange(sheetRow, COL_VERIFIED_PHONE_MASTER).setValue(normalizeToDomesticJP_(phoneInputRaw));
      masterSheet.getRange(sheetRow, COL_VERIFIED_AT_MASTER).setValue(nowStr);
    }

    // ★ line_user_id を保存（空欄のみ）
    const luid = String(body.line_user_id || "").trim();
    if (luid) {
      const curLuid = String(masterSheet.getRange(sheetRow, COL_LINE_USER_ID_MASTER).getValue() || "").trim();
      if (!curLuid) masterSheet.getRange(sheetRow, COL_LINE_USER_ID_MASTER).setValue(luid);
    }

  } catch (e) {
    Logger.log("save verified to master failed (againPid): " + e);
  }

  return jsonResponse({ ok: true, pid: againPid, name, answerer_id: answererId });
}

    // 空なら発行して書き込み
    const answeredAt = hitRow[IDX_ANSWERED_AT]; // B
    const yyyymm = _toYYYYMM_(answeredAt) || Utilities.formatDate(new Date(), TZ, "yyyyMM");
    const newPid = _issueMonthlySerialPid_(yyyymm);

pidCell.setValue(newPid);

try {
  ensureMasterVerifiedHeaders_(masterSheet);
  const nowStr = Utilities.formatDate(new Date(), TZ, "yyyy/MM/dd HH:mm:ss");

  const cur = String(masterSheet.getRange(sheetRow, COL_VERIFIED_PHONE_MASTER).getValue() || "").trim();
  if (!cur) {
    masterSheet.getRange(sheetRow, COL_VERIFIED_PHONE_MASTER).setValue(normalizeToDomesticJP_(phoneInputRaw));
    masterSheet.getRange(sheetRow, COL_VERIFIED_AT_MASTER).setValue(nowStr);
  }

  // ★ line_user_id を保存（空欄のみ）
  const luid = String(body.line_user_id || "").trim();
  if (luid) {
    const curLuid = String(masterSheet.getRange(sheetRow, COL_LINE_USER_ID_MASTER).getValue() || "").trim();
    if (!curLuid) masterSheet.getRange(sheetRow, COL_LINE_USER_ID_MASTER).setValue(luid);
  }

} catch (e) {
  Logger.log("save verified to master failed (newPid): " + e);
}

return jsonResponse({ ok: true, pid: newPid, name, answerer_id: answererId });


  } finally {
    lock.releaseLock();
  }
}

function _toYYYYMM_(v) {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function _issueMonthlySerialPid_(yyyymm) {
  const props = PropertiesService.getDocumentProperties();
  const key = `PID_COUNTER_${yyyymm}`;

  // 現在値（未設定なら月ごとの初期値）
  let current = Number(props.getProperty(key) || "0");

  // ★ 初回だけ 202512 は 00010 から始めたい → current を 9 にする
  // （= next = 10 → PID末尾 00010）
  if (!props.getProperty(key)) {
    if (yyyymm === "202512") {
      current = 9;
    } else {
      current = 0;
    }
  }

  const next = current + 1;
  props.setProperty(key, String(next));
  return `${yyyymm}${String(next).padStart(5, "0")}`;
}



    // ========= ① patient_link (旧: LINE連携 birth+tel照合) =========
    if (
      type === "patient_link" ||
      (!type && body.birth && body.tel)
    ) {
      const birthInput = body.birth;
      const telInputRaw = body.tel || "";
      const lineUserId = body.line_user_id || "";

      if (!birthInput || !telInputRaw) {
        return jsonResponse({ ok: false, message: "bad_request" });
      }

      if (!masterSheet) {
        return jsonResponse({ ok: false, message: "sheet_not_found" });
      }

      const mLastRow = masterSheet.getLastRow();
      if (mLastRow < 2) {
        return jsonResponse({ ok: false, message: "no_data" });
      }

      const mValues = masterSheet.getRange(2, 1, mLastRow - 1, 12).getValues();
      const COL_BIRTH = 7;  // H 生年月日
      const COL_TEL   = 8;  // I 電話番号
      const COL_PID   = 11; // L Patient_ID
      const COL_NAME  = 4;  // E 氏名

      const birthNorm = normalizeBirth(birthInput);
      const telFromInput = normalizeTel(telInputRaw);

      let hit = null;

      for (let i = 0; i < mValues.length; i++) {
        const row = mValues[i];
        const rowBirthNorm = normalizeBirth(row[COL_BIRTH]);
        const telFromRow = normalizeTel(row[COL_TEL]);

        const fullMatch = telFromRow.digits === telFromInput.digits;
        const looseMatch =
          telFromRow.noHeadZero &&
          telFromRow.noHeadZero === telFromInput.noHeadZero;

        if (rowBirthNorm === birthNorm && (fullMatch || looseMatch)) {
          hit = {
            patient_id: row[COL_PID],
            name: row[COL_NAME],
          };
          Logger.log("patient_link HIT at row " + (i + 2));
          break;
        }
      }

      if (!hit || !hit.patient_id) {
        Logger.log("patient_link NO HIT");
        return jsonResponse({ ok: false, message: "not_found" });
      }

      return jsonResponse({
        ok: true,
        patient_id: hit.patient_id,
        name: hit.name,
      });
    }
// ========= ①-5 doctor_call_status（不通フラグ等） =========
if (type === "doctor_call_status") {
  const reserveId = String(body.reserveId || "").trim();
  const callStatus = String(body.callStatus || "").trim(); // "no_answer" or ""

  if (!reserveId) {
    return jsonResponse({ ok: false, error: "reserveId required" });
  }
  if (!intakeSheet) {
    return jsonResponse({ ok: false, error: "intake_sheet_not_found" });
  }

  const values = intakeSheet.getDataRange().getValues();
  const updatedAt = Utilities.formatDate(new Date(), TZ, "yyyy/MM/dd HH:mm:ss");
  let found = false;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][COL_RESERVE_ID_INTAKE - 1]) === reserveId) {
      intakeSheet.getRange(i + 1, COL_CALL_STATUS_INTAKE).setValue(callStatus);     // AE
      intakeSheet.getRange(i + 1, COL_CALL_STATUS_AT_INTAKE).setValue(updatedAt);   // AF
      found = true;
      break;
    }
  }

  if (!found) {
    return jsonResponse({ ok: false, error: "reserveId not found" });
  }

  return jsonResponse({ ok: true, call_status: callStatus, updated_at: updatedAt });
}

    // ========= ② doctor_update =========
    if (type === "doctor_update") {
      const reserveId = body.reserveId;
      const status = body.status || "";
      const note   = body.note   || "";
      const menu   = body.prescriptionMenu || "";

      if (!reserveId) {
        return ContentService
          .createTextOutput(JSON.stringify({ ok:false, error:"reserveId required" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const values = intakeSheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][COL_RESERVE_ID_INTAKE - 1]) === String(reserveId)) {
          if (status) {
            intakeSheet.getRange(i + 1, COL_STATUS_INTAKE).setValue(status);
          }
          intakeSheet.getRange(i + 1, COL_NOTE_INTAKE).setValue(note);
          intakeSheet.getRange(i + 1, COL_MENU_INTAKE).setValue(menu);
          // ★ OK/NG確定のタイミングで「不通」を解除（AE/AF）
intakeSheet.getRange(i + 1, COL_CALL_STATUS_INTAKE).setValue("");
intakeSheet.getRange(i + 1, COL_CALL_STATUS_AT_INTAKE).setValue(
  Utilities.formatDate(new Date(), TZ, "yyyy/MM/dd HH:mm:ss")
);

          Logger.log("doctor_update row: " + (i + 1));
          break;
        }
      }

      return ContentService
        .createTextOutput(JSON.stringify({ ok:true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

// ========= ③ intake（問診保存） =========
if (type === "intake" || body.answers) {
  if (!intakeSheet) {
    return jsonResponse({ ok: false, error: "intake_sheet_not_found" });
  }

  const pid = String(body.patient_id || body.patientId || "").trim();
  if (!pid) {
    return jsonResponse({ ok: false, error: "patient_id_required" });
  }

  // 🔒 PID単位で二重登録を防ぐ
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    // ★ 既に同一PIDの問診が1件でもあれば追加しない（= 問診は1回のみ）
const existingSubmitted = findExistingSubmittedIntakeByPid_(intakeSheet, pid);
if (existingSubmitted) {
  return jsonResponse({
    ok: true,
    intakeId: existingSubmitted === "submitted" ? "" : String(existingSubmitted),
    dedup: true,
  });
}


    const answersObj = body.answers || {};
    const answerValues = ANSWER_KEYS.map(function (k) {
      const v = answersObj[k];
      return v == null ? "" : String(v);
    });

    // 問診→予約フローなので reserveId/日時は空でOK
    const reserveId = "";
    const reservedDate = "";
    const reservedTime = "";

    const intakeId =
      "intake-" + Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMddHHmmssSSS");

    const rowToAppend = [
      new Date(),                 // A timestamp
      reserveId,                  // B reserveId（空）
      body.submittedAt || new Date(),   // C submittedAt
      body.name || "",            // D name
      body.sex || "",             // E sex
      body.birth || "",           // F birth
      body.line_id || body.lineId || "", // G line_id
      reservedDate,               // H reserved_date（空）
      reservedTime,               // I reserved_time（空）
      ...answerValues,            // J〜S answers
      "",                         // T status
      "",                         // U doctor_note
      "",                         // V prescription_menu
      body.name_kana || body.nameKana || "", // W name_kana
      body.tel || body.phone || "",          // X tel
      body.answerer_id || "",     // Y answerer_id
      pid,                        // Z patient_id（正規化済み）
      intakeId,                   // AA intakeId
    ];

    intakeSheet.appendRow(rowToAppend);

    // ★ master(M/N) → intake(AG/AH)
    try {
      ensureIntakeVerifiedHeaders_(intakeSheet);

      const v = findVerifiedFromMasterByPid_(masterSheet, pid);
      if (v && v.phone) {
        const row = intakeSheet.getLastRow(); // 今appendした行
        const cur = String(intakeSheet.getRange(row, COL_VERIFIED_PHONE_INTAKE).getValue() || "").trim();
        if (!cur) {
          intakeSheet.getRange(row, COL_VERIFIED_PHONE_INTAKE).setValue(v.phone);
          intakeSheet.getRange(row, COL_VERIFIED_AT_INTAKE).setValue(
            v.at || Utilities.formatDate(new Date(), TZ, "yyyy/MM/dd HH:mm:ss")
          );
        }
      }
    } catch (e) {
      Logger.log("write verified to intake failed: " + e);
    }

    syncQuestionnaireFromMaster();

    return jsonResponse({ ok: true, intakeId: intakeId });
  } finally {
    lock.releaseLock();
  }
}

// ========= save_line_user_id（再訪時の回収）=========
if (type === "save_line_user_id") {
  if (!masterSheet) return jsonResponse({ ok: false, error: "sheet_not_found" });

  const pid  = String(body.patient_id || body.pid || "").trim();
  const luid = String(body.line_user_id || "").trim();

  if (!pid || !luid) return jsonResponse({ ok: false, error: "bad_request" });

  const COL_LINE_USER_ID_MASTER = 15; // O（あなたがOに入れてる前提）
  const lastRow = masterSheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ ok: false, error: "no_data" });

  const values = masterSheet.getRange(2, 1, lastRow - 1, COL_LINE_USER_ID_MASTER).getValues();
  const IDX_PID  = 11; // L (0-based)
  const IDX_LUID = 14; // O (0-based)

  for (let i = values.length - 1; i >= 0; i--) {
    const rowPid = String(values[i][IDX_PID] || "").trim();
    if (rowPid !== pid) continue;

    const cur = String(values[i][IDX_LUID] || "").trim();
    if (!cur) masterSheet.getRange(i + 2, COL_LINE_USER_ID_MASTER).setValue(luid); // 空欄のみ
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "not_found" });
}


    // ========= unknown type =========
    Logger.log("unknown type: " + type);
    return ContentService
      .createTextOutput(JSON.stringify({ ok:false, error:"unknown type" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("ERROR in doPost: " + err);
    return ContentService
      .createTextOutput(JSON.stringify({ ok:false, error:String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =====================
// 問診マスター → 問診シート転記
// =====================

// =====================
// 問診マスター → 問診シート転記（名前等 + line_id + verified）
// =====================
function syncQuestionnaireFromMaster() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const masterSheet = ss.getSheetByName(SHEET_NAME_MASTER);
  const qSheet      = ss.getSheetByName(SHEET_NAME_INTAKE);

  if (!masterSheet) throw new Error("シート「問診マスター」が見つかりません");
  if (!qSheet)      throw new Error("シート「問診」が見つかりません");

  const mLastRow = masterSheet.getLastRow();
  if (mLastRow < 2) return;

  // ★A〜O（15列）を読む：M/N/O を使うため
  const MASTER_COLS = Math.max(COL_LINE_USER_ID_MASTER, COL_VERIFIED_AT_MASTER); // 15
  const mValues = masterSheet.getRange(2, 1, mLastRow - 1, MASTER_COLS).getValues();

  // master（0-based）
  const M_COL_ANSWERER_ID = 2;   // C 回答者ID
  const M_COL_NAME        = 4;   // E 氏名
  const M_COL_NAME_KANA   = 5;   // F 氏名(カナ)
  const M_COL_SEX         = 6;   // G 性別
  const M_COL_BIRTH       = 7;   // H 生年月日
  const M_COL_TEL         = 8;   // I 電話番号
  const M_COL_PID         = 11;  // L Patient_ID
  const M_COL_VER_PHONE   = COL_VERIFIED_PHONE_MASTER - 1; // M (12)
  const M_COL_VER_AT      = COL_VERIFIED_AT_MASTER - 1;    // N (13)
  const M_COL_LINE_USERID = COL_LINE_USER_ID_MASTER - 1;   // O (14)

  // PID -> master row（最新行優先＝後勝ち）
  const masterByPid = {};
  for (let i = 0; i < mValues.length; i++) {
    const row = mValues[i];
    const pid = String(row[M_COL_PID] || "").trim();
    if (!pid) continue;
    masterByPid[pid] = row;
  }

  const qLastRow = qSheet.getLastRow();
  if (qLastRow < 2) return;

  // ★ A〜AA（27列）だけを対象にする（AB〜AD の数式を壊さない）
  const SAFE_COLS = 27; // AA まで
  const qValues = qSheet.getRange(2, 1, qLastRow - 1, SAFE_COLS).getValues();

  // 問診（0-based）
  const Q_COL_NAME       = 3;   // D name
  const Q_COL_SEX        = 4;   // E sex
  const Q_COL_BIRTH      = 5;   // F birth
  const Q_COL_LINE_ID    = 6;   // G line_id
  const Q_COL_NAME_KANA  = 22;  // W name_kana
  const Q_COL_TEL        = 23;  // X tel
  const Q_COL_ANSWERERID = 24;  // Y answerer_id
  const Q_COL_PID        = 25;  // Z patient_id

  // verified をまとめて更新するための配列（AG/AH用）
  ensureIntakeVerifiedHeaders_(qSheet);
  const numRows = qLastRow - 1;

  // 現状のAG/AHを一括取得（空欄だけ埋める）
  const curAG = qSheet.getRange(2, COL_VERIFIED_PHONE_INTAKE, numRows, 1).getDisplayValues(); // verified_phone
  const curAH = qSheet.getRange(2, COL_VERIFIED_AT_INTAKE,    numRows, 1).getDisplayValues(); // verified_at

  let updatedAA = 0;
  let updatedVer = 0;

  for (let i = 0; i < qValues.length; i++) {
    const row = qValues[i];
    const pid = String(row[Q_COL_PID] || "").trim();
    if (!pid) continue;

    const mRow = masterByPid[pid];
    if (!mRow) continue;

  // 既存同期（A〜AA内）
row[Q_COL_NAME]       = mRow[M_COL_NAME];
row[Q_COL_SEX]        = mRow[M_COL_SEX];
row[Q_COL_BIRTH]      = mRow[M_COL_BIRTH];
row[Q_COL_NAME_KANA]  = mRow[M_COL_NAME_KANA];
// row[Q_COL_TEL]     = mRow[M_COL_TEL];  // ← ★削除（移行仕様のため）
row[Q_COL_ANSWERERID] = mRow[M_COL_ANSWERER_ID];
row[Q_COL_PID]        = mRow[M_COL_PID];

// ★ O(line_user_id) → 問診G(line_id)（空欄のみ）
const luid = String(mRow[M_COL_LINE_USERID] || "").trim();
const curLine = String(row[Q_COL_LINE_ID] || "").trim();
if (!curLine && luid) row[Q_COL_LINE_ID] = luid;

    // =========================
    // ① verified（M/N → AG/AH）を先に確定（空欄のみ）
    // =========================
    const vPhoneRaw = String(mRow[M_COL_VER_PHONE] || "").trim();
    const vAtRaw    = String(mRow[M_COL_VER_AT] || "").trim();

    const beforeAG = String(curAG[i][0] || "").trim();
    if (!beforeAG && vPhoneRaw) {
      curAG[i][0] = vPhoneRaw;
      curAH[i][0] = vAtRaw || Utilities.formatDate(new Date(), TZ, "yyyy/MM/dd HH:mm:ss");
      updatedVer++;
    }

    // =========================
    // ② X列tel：verified(AG)があればそれを採用（上書きOK）
    //    verifiedが無い人は既存Xを維持（触らない）
    // =========================
// ② X列tel：verified(AG)があればそれを採用（上書きOK）
const verPhoneFinal = String(curAG[i][0] || "").trim();
const telXNow = String(row[Q_COL_TEL] || "").trim();
if (verPhoneFinal && telXNow !== verPhoneFinal) {
  row[Q_COL_TEL] = verPhoneFinal;
}
  }

  // =========================
  // 書き戻し（確実に反映させる）
  // =========================

  // A〜AA は常に書き戻す（AB〜ADは触らない）
  // ※ tel(X)など qValues 内の更新を取りこぼさないため
  qSheet.getRange(2, 1, qValues.length, SAFE_COLS).setValues(qValues);

  // verified（AG/AH）は更新があった場合のみ書き戻す（軽量化）
  if (updatedVer > 0) {
    qSheet.getRange(2, COL_VERIFIED_PHONE_INTAKE, numRows, 1).setValues(curAG);
    qSheet.getRange(2, COL_VERIFIED_AT_INTAKE,    numRows, 1).setValues(curAH);
  }

  Logger.log(`syncQuestionnaireFromMaster updatedVerified=${updatedVer}`);
}

function syncQuestionnaireFromMasterCron() {
  syncQuestionnaireFromMaster();
}

// =====================
// 再処方：patient_id の「最新5件」を下（新しい）から回収（マイページ用・安定版）
// - findAll を使わない（ヒット全件収集しない）
// - patient_id 列だけを1回読み、末尾から走査
// - 一致した行だけ必要列を読む
// =====================
function loadReordersForDashboard_(patientId) {
  const pid = String(patientId || "").trim();
  if (!pid) return [];

  // ★ キャッシュチェック（30分）
  const cache = CacheService.getScriptCache();
  const cacheKey = "reorders_" + pid;
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // パース失敗時は続行（再取得）
    }
  }

  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty("REORDER_SHEET_ID");
  const sheetName = props.getProperty("REORDER_SHEET_NAME") || "シート1";
  if (!sheetId) return [];

  let ss, sheet;
  try {
    ss = SpreadsheetApp.openById(sheetId);
    sheet = ss.getSheetByName(sheetName);
  } catch (e) {
    return [];
  }
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // ヘッダで列特定（固定だが保険で）
  const map = headerIndexMap_(sheet);
  const colTs   = map["timestamp"]    || 1;
  const colPid  = map["patient_id"]   || 2;
  const colProd = map["product_code"] || 3;
  const colSt   = map["status"]       || 4;
  const colNote = map["note"]         || 5;

  // patient_id列だけ一括取得（軽い）
  const pidColVals = sheet.getRange(2, colPid, lastRow - 1, 1).getValues(); // [[pid],[pid],...]
  const needCols = Math.max(colTs, colPid, colProd, colSt, colNote);

  const out = [];
  // 下（新しい）から最大5件だけ拾う
  for (let i = pidColVals.length - 1; i >= 0; i--) {
    const rowPid = String(pidColVals[i][0] || "").trim();
    if (rowPid !== pid) continue;

    const r = i + 2; // 実シート行番号
    const v = sheet.getRange(r, 1, 1, needCols).getValues()[0];

    const ts = v[colTs - 1];
    const tsStr = ts instanceof Date
      ? Utilities.formatDate(ts, "Asia/Tokyo", "yyyy-MM-dd'T'HH:mm:ssXXX")
      : String(ts || "");

    const st = String(v[colSt - 1] || "").trim();
    const prod = String(v[colProd - 1] || "").trim();
    const note = String(v[colNote - 1] || "").trim();

    out.push({
      id: String(r), // 行番号で安定（表示用途）
      status: st,
      createdAt: tsStr,
      productCode: prod,
      note: note,
      mg: "", // 互換用
    });

    if (out.length >= 5) break;
  }

  // ★ キャッシュに保存（30分 = 1800秒）
  try {
    cache.put(cacheKey, JSON.stringify(out), 1800);
  } catch (e) {
    // キャッシュ保存失敗は無視
  }

  return out;
}


function toPaidAtJst_(v) {
  if (!v) return "";

  // すでに "yyyy/MM/dd HH:mm:ss" っぽいならそのまま
  const s0 = String(v).trim();
  if (!s0) return "";

// すでに "yyyy/MM/dd HH:mm:ss" ならそのまま返す（★追加）
if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s0)) return s0;
  // 例: "2025/12/18 12:45" → 秒を補う
  if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}$/.test(s0)) return s0 + ":00";

  // 例: "2025-12-18 12:45:00" → "/"に寄せる
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s0)) return s0.replace(/-/g, "/");

  // 例: ISOっぽい "2025-12-18T12:45:00+09:00" なども拾う
  const d = new Date(s0);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
  }

  // 最後の保険：dateだけなら 00:00:00 を付ける
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s0)) return s0 + " 00:00:00";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s0)) return s0.replace(/-/g, "/") + " 00:00:00";

  return ""; // パース不能なら空
}
function toJstYmdHms_(v) {
  if (!v) return "";

  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
  }

  const s = String(v || "").trim();
  if (!s) return "";

  if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}$/.test(s)) return s + ":00";
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) return s.replace(/-/g, "/");

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
  }
  return "";
}

function calcShippingEtaFromPaidAtJst_(paidAtJst) {
  const s = String(paidAtJst || "").trim();
  if (!s) return "";

  const iso = s.replace(/\//g, "-").replace(" ", "T") + "+09:00";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "";

  const cutoff = new Date(dt.getTime());
  cutoff.setHours(12, 0, 0, 0);

  const shipDate = new Date(dt.getTime());
  if (dt.getTime() > cutoff.getTime()) shipDate.setDate(shipDate.getDate() + 1);

  const y = shipDate.getFullYear();
  const m = ("0" + (shipDate.getMonth() + 1)).slice(-2);
  const d = ("0" + shipDate.getDate()).slice(-2);
  return `${y}-${m}-${d}`;
}



// =====================
// Square Webhook シートから patient_id ごとの注文情報を取得（マイページ用）
// =====================
function loadOrdersForDashboard_(patientId, full) {
  var t0 = new Date().getTime();
  var perfOrders = [];
  var mark = function (label) {
    try {
      perfOrders.push([label, new Date().getTime() - t0]);
    } catch (e) {}
  };

  // 返すときの共通形（必ず _perf_orders を含める）
  var empty = function () {
    return {
      orders: [],
      flags: { canPurchaseCurrentCourse: true, canApplyReorder: false, hasAnyPaidOrder: false },
      _perf_orders: perfOrders,
    };
  };

  try {
    if (!patientId) return empty();

    var props = PropertiesService.getScriptProperties();
    var sheetId =
      props.getProperty("SHEET_ID_WEBHOOK") ||
      props.getProperty("WEBHOOK_SHEET_ID");
    var sheetName =
      props.getProperty("SHEET_NAME_WEBHOOK") ||
      props.getProperty("WEBHOOK_SHEET_NAME") ||
      "Square Webhook";

    if (!sheetId) return empty();

    // ---- Webhookブックを開く（現状：注文データ本体がWebhookにあるため） ----
    var ss = SpreadsheetApp.openById(sheetId);
    mark("O_open_webhook_ss");

    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return empty();

var map = getWebhookHeaderMapCached_(sheet);
mark("O_header_map_done");

    var colPay = map["payment_id"];
    if (!colPay) return empty();

    // ---- pid -> Webhook行番号CSV（mirror） ----
    var pidKey = normalizePid_(patientId);
var rows = getWebhookIndexRowsByPidFromMirror_(pidKey, perfOrders);
mark("O_pid_rows_done");
mark("O_index_rows");

// ★追加：5件超あるか（indexは最大30件保持なので判定には十分）
var hasMoreOrderHistory = rows.length > 5;

// 直近N件だけ（初期は軽量化。full=1 の時は多めに返す）
rows = rows.slice(0, full ? 30 : 10);

    // ---- 必要列（1-based） ----
    var colOrderDt = map["order_datetime"] || map["orderDatetime"] || 0;
    var colItems   = map["items"] || 0;
    var colProd    = map["product_code"] || map["productCode"] || 0;
    var colAmount  = map["amount"] || 0;

    var colPayStatus = map["payment_status"] || 0;
    var colRefund    = map["refund_status"] || map["refundStatus"] || 0;
    var colRefAmt    = map["refunded_amount"] || map["refundedAmount"] || 0;
    var colRefAt     = map["refunded_at"] || map["refundedAt"] || 0;

    // ★必要列数だけ読む（全列読み禁止）
    var NEED_COLS = 0;
    var cols = [colPay, colOrderDt, colItems, colProd, colAmount, colPayStatus, colRefund, colRefAmt, colRefAt];
    for (var ci = 0; ci < cols.length; ci++) {
      var c = Number(cols[ci] || 0);
      if (c > NEED_COLS) NEED_COLS = c;
    }
if (!NEED_COLS || NEED_COLS < 1) NEED_COLS = Math.min(sheet.getLastColumn(), 30);

    // ---- Webhook行を連続レンジでまとめ取り ----
    var rowsAsc = rows.slice().sort(function (a, b) { return a - b; });
    var groups = groupContiguousRows_(rowsAsc);

    var rowMap = {}; // rowNumber -> rowValues (display)
    for (var g = 0; g < groups.length; g++) {
      var start = groups[g][0];
      var end = groups[g][1];
      var n = end - start + 1;

var block = sheet.getRange(start, 1, n, NEED_COLS).getValues();
      for (var j = 0; j < n; j++) {
        rowMap[start + j] = block[j];
      }
    }

    var orders = [];

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var row = rowMap[r];
      if (!row) continue;

      var paymentId = String(row[colPay - 1] || "").trim();
      if (!paymentId) continue;

var orderDatetimeRaw = colOrderDt ? row[colOrderDt - 1] : "";
var itemsText     = colItems   ? String(row[colItems - 1] || "").trim() : "";
var productCode   = colProd    ? String(row[colProd - 1] || "").trim() : "";
var amountRaw     = colAmount  ? String(row[colAmount - 1] || "").trim() : "";

var paymentStatus = colPayStatus ? String(row[colPayStatus - 1] || "").trim() : "paid";
var refundStatus  = colRefund    ? String(row[colRefund - 1] || "").trim() : "";
var refundedAmountRaw = colRefAmt ? String(row[colRefAmt - 1] || "").trim() : "";
var refundedAtJst = colRefAt ? String(row[colRefAt - 1] || "").trim() : "";

var amount = Number(amountRaw) || 0;
var refundedAmount = Number(refundedAmountRaw);
if (!isFinite(refundedAmount)) refundedAmount = 0;

var productName = (itemsText && itemsText.trim()) ? itemsText : (productCode || "マンジャロ");

// ★ paidAt を確実に作る
var paidAtJst = toJstYmdHms_(orderDatetimeRaw);

// ★ shipping_eta を確実に作る（12時締め）
var shippingEta = calcShippingEtaFromPaidAtJst_(paidAtJst);
// ★デバッグ（最初の1件だけ。PIIなし）
if (orders.length === 0) {
  perfOrders.push(["debug_colOrderDt", String(colOrderDt)]);
  perfOrders.push(["debug_orderDatetimeRaw_type", Object.prototype.toString.call(orderDatetimeRaw)]);
  perfOrders.push(["debug_orderDatetimeRaw_str", String(orderDatetimeRaw || "").slice(0, 30)]);
  perfOrders.push(["debug_paidAtJst", String(paidAtJst || "")]);
}


orders.push({
  id: paymentId || ("PAY-" + r),
  payment_id: paymentId,
  product_code: productCode,
  product_name: productName,
  amount: amount,
  paid_at_jst: paidAtJst,
  shipping_status: "pending",
  shipping_eta: shippingEta,
  tracking_number: "",
  payment_status: paymentStatus || "paid",
  refund_status: refundStatus || "",
  refunded_amount: refundedAmount || 0,
  refunded_at_jst: refundedAtJst || "",
});
    }

    mark("O_read_webhook_rows");

    // flags
    var hasAnyPaidOrder = orders.length > 0;
    var flags = {
      canPurchaseCurrentCourse: !hasAnyPaidOrder,
      canApplyReorder: hasAnyPaidOrder,
      hasAnyPaidOrder: hasAnyPaidOrder,
    };

// =========================
// shipping_index で追跡・発送情報を補完（最適化：必要な payment_id だけ読む）
// =========================
mark("O_begin_merge_shipping");
try {
  if (orders.length > 0) {
    // ★ 注文の payment_id リストを作成
    const paymentIds = [];
    for (var oi = 0; oi < orders.length; oi++) {
      var payId = String(orders[oi].payment_id || orders[oi].id || "").trim();
      if (payId) paymentIds.push(payId);
    }

    // ★ 必要な分だけ読み取り
    const shipMap = getShippingIndexMapForPaymentIds_(paymentIds, perfOrders);

    for (var oi = 0; oi < orders.length; oi++) {
      var payId = String(orders[oi].payment_id || orders[oi].id || "").trim();
      if (!payId) continue;

      var s = shipMap[payId];
      if (!s) continue;

      if (s.tracking_number) orders[oi].tracking_number = s.tracking_number;
      if (s.shipping_status) orders[oi].shipping_status = s.shipping_status;
      if (s.shipping_date)   orders[oi].shipping_eta = s.shipping_date;

      // carrier が使えるなら付与（フロントでヤマト/郵便分岐に使える）
      if (s.carrier) orders[oi].carrier = s.carrier;
    }
  }
} catch (eShip) {
  perfOrders.push(["merge_shipping_error", String(eShip && eShip.message ? eShip.message : eShip)]);
}
mark("O_end_merge_shipping");


    mark("O_done");

    return { orders: orders, flags: flags, _perf_orders: perfOrders };

  } catch (err) {
    // ここで落ちても JSON は返す
    perfOrders.push(["orders_exception", String(err && err.message ? err.message : err)]);
    return {
      orders: [],
      flags: { canPurchaseCurrentCourse: true, canApplyReorder: false, hasAnyPaidOrder: false },
      _perf_orders: perfOrders,
      __orders_err: String(err && err.message ? err.message : err),
    };
  }
}

function testLoadOrdersForDashboard() {
  var pid = "20251200128"; // ←あなたが確認したPID

  var props = PropertiesService.getScriptProperties();
  var sheetId =
    props.getProperty("SHEET_ID_WEBHOOK") ||
    props.getProperty("WEBHOOK_SHEET_ID");
  var sheetName =
    props.getProperty("SHEET_NAME_WEBHOOK") ||
    props.getProperty("WEBHOOK_SHEET_NAME") ||
    "Square Webhook";

  Logger.log("WEBHOOK sheetId=" + sheetId);
  Logger.log("WEBHOOK sheetName=" + sheetName);

  var ss = SpreadsheetApp.openById(sheetId);
  var sh = ss.getSheetByName(sheetName);
  if (!sh) {
    Logger.log("sheet not found");
    return;
  }

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  Logger.log("lastRow=" + lastRow + " lastCol=" + lastCol);

  // 1) ヘッダー確認（patient_id列が本当にあるか）
  var header = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  var idxPatient = header.indexOf("patient_id"); // 0-based
  Logger.log("header.patient_id index=" + idxPatient + " (0-based), col=" + (idxPatient + 1));

  // 2) まず「L列(12列目)」にPIDがいるか TextFinder で確認（人間の目より確実）
  var colL = sh.getRange(2, 12, Math.max(0, lastRow - 1), 1);
  var tfL = colL.createTextFinder(pid).matchEntireCell(true);
  var hitL = tfL.findNext();
  Logger.log("TextFinder in L(col12) hit=" + (hitL ? ("row=" + hitL.getRow()) : "none"));

  // 3) 次に「ヘッダー patient_id 列」にPIDがいるか確認（列ズレ検出）
  if (idxPatient >= 0) {
    var colPid = sh.getRange(2, idxPatient + 1, Math.max(0, lastRow - 1), 1);
    var tfP = colPid.createTextFinder(pid).matchEntireCell(true);
    var hitP = tfP.findNext();
    Logger.log("TextFinder in header(patient_id) col hit=" + (hitP ? ("row=" + hitP.getRow()) : "none"));
  }

  // 4) ついでに、先頭20行の「L列の中身」をログ（見た目一致なのに違う問題の検出）
  var sample = sh.getRange(2, 12, Math.min(20, Math.max(0, lastRow - 1)), 1).getDisplayValues();
  Logger.log("L sample (first 20): " + JSON.stringify(sample.map(r => r[0])));
}

function normalizePid_(v) {
  return String(v || "").replace(/[\s\u200B-\u200D\uFEFF]/g, "").trim();
}
/**
 * 過去分：問診マスター(O=line_user_id) → 問診(G=line_id) を一括反映
 * - PID一致（master:L と intake:Z）を最優先
 * - intakeのGが空欄の行だけ埋める（上書きしない）
 */
function backfillLineUserIdMasterToIntakeOnce() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const master = ss.getSheetByName(SHEET_NAME_MASTER);
  const intake = ss.getSheetByName(SHEET_NAME_INTAKE);
  if (!master) throw new Error("問診マスターが見つかりません");
  if (!intake) throw new Error("問診が見つかりません");

  const mLast = master.getLastRow();
  const iLast = intake.getLastRow();
  if (mLast < 2 || iLast < 2) return;

  // master: A〜O(15列) 必要（L=12, O=15）
  const M_COLS = Math.max(COL_LINE_USER_ID_MASTER, 12); // 念のため
  const mVals = master.getRange(2, 1, mLast - 1, M_COLS).getValues();

  // PID -> line_user_id の最新を作る（下の行ほど新しい想定なので後勝ち）
  const pidToLine = {};
  for (let i = 0; i < mVals.length; i++) {
    const row = mVals[i];
    const pid = String(row[11] || "").trim(); // L(0-based 11)
    const luid = String(row[COL_LINE_USER_ID_MASTER - 1] || "").trim(); // O
    if (pid && luid) pidToLine[pid] = luid;
  }

  // intake: A〜AA(27列) でOK（G=7, Z=26）
  const SAFE_COLS = 27;
  const iVals = intake.getRange(2, 1, iLast - 1, SAFE_COLS).getValues();

  const IDX_LINE_G = 6; // G（0-based）
  const IDX_PID_Z  = COL_PATIENT_ID_INTAKE - 1; // Z（0-based 25）

  let updated = 0;

  for (let r = 0; r < iVals.length; r++) {
    const row = iVals[r];
    const curLine = String(row[IDX_LINE_G] || "").trim();
    if (curLine) continue; // 既に入ってるなら上書きしない

    const pid = String(row[IDX_PID_Z] || "").trim();
    if (!pid) continue;

    const luid = pidToLine[pid];
    if (!luid) continue;

    row[IDX_LINE_G] = luid;
    updated++;
  }

  if (updated > 0) {
    intake.getRange(2, 1, iVals.length, SAFE_COLS).setValues(iVals);
  }

  Logger.log("backfillLineUserIdMasterToIntakeOnce updated=" + updated);
}
function getWebhookIndexRowsByPidFromMirror_(pid, perfOrders) {
  const key = String(pid || "").trim();
  if (!key) return [];

  const t0 = new Date().getTime();
  const mark = (label) => {
    if (Array.isArray(perfOrders)) {
      perfOrders.push([label, new Date().getTime() - t0]);
    }
  };

  const cache = CacheService.getScriptCache();
  const cacheKey = "pid_rows_csv_" + key;

  // ===== cache hit =====
  const cached = cache.get(cacheKey);
  if (cached) {
    mark("O_pid_index_cache_hit");
    return cached
      .split(",")
      .map(s => Number(s))
      .filter(n => Number.isFinite(n) && n >= 2);
  }

  // ===== cache miss =====
  mark("O_pid_index_cache_miss");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName("pid_webhook_index_mirror");
  if (!sh) return [];

  const last = sh.getLastRow();
  if (last < 2) return [];

  const rng = sh.getRange(2, 1, last - 1, 1);
  const cell = rng.createTextFinder(key).matchEntireCell(true).findNext();
  if (!cell) return [];

  const r = cell.getRow();
  const csv = String(sh.getRange(r, 2).getValue() || "").trim();

  if (csv) {
    cache.put(cacheKey, csv, 1800); // 30分
    mark("O_pid_index_cache_store");
  }

  return csv
    ? csv.split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n >= 2)
    : [];
}

function initPidWebhookIndexMirrorOnce() {
  const props = PropertiesService.getScriptProperties();
  const webhookSheetId = props.getProperty("WEBHOOK_SHEET_ID"); // Square Webhook ブックID
  if (!webhookSheetId) throw new Error("WEBHOOK_SHEET_ID not set in Script Properties");

  // 1) 元（Square Webhookブック）の pid_webhook_index
  const srcSS = SpreadsheetApp.openById(webhookSheetId);
  const src = srcSS.getSheetByName("pid_webhook_index");
  if (!src) throw new Error("pid_webhook_index not found in webhook book");

  const srcLast = src.getLastRow();
  if (srcLast < 2) throw new Error("pid_webhook_index has no data");

  const values = src.getRange(2, 1, srcLast - 1, 3).getValues(); // [patient_id, rowsCsv, updated_at]

  // 2) 先（問診ブック）の pid_webhook_index_mirror を作る
  const mySS = SpreadsheetApp.openById(SPREADSHEET_ID);
  let dst = mySS.getSheetByName("pid_webhook_index_mirror");
  if (!dst) {
    dst = mySS.insertSheet("pid_webhook_index_mirror");
    dst.getRange(1, 1, 1, 3).setValues([["patient_id", "rows", "updated_at"]]);
  }

  // 3) 既存データをクリアして貼り直し
  const dstLast = dst.getLastRow();
  if (dstLast >= 2) dst.getRange(2, 1, dstLast - 1, 3).clearContent();

  dst.getRange(2, 1, values.length, 3).setValues(values);

  Logger.log("Mirror initialized: rows=" + values.length);
}

function getWebhookHeaderMapCached_(sheet) {
  const cache = CacheService.getScriptCache();
  const key = "webhook_header_map_v1";
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  // ヘッダーは固定幅で読む（lastColを取らない）
  const maxCols = Math.min(60, sheet.getMaxColumns());
  const header = sheet.getRange(1, 1, 1, maxCols).getValues()[0];

  const map = {};
  for (let i = 0; i < header.length; i++) {
    const k = String(header[i] || "").trim();
    if (k) map[k] = i + 1; // 1-based
  }

  // TTLは長めでOK（ヘッダーが変わったら手動で invalidate すればよい）
  cache.put(key, JSON.stringify(map), 21600); // 6時間

  return map;
}
// submittedAt(C列) が入っている「提出済み問診」があるか（PID基準・軽量）
function hasSubmittedIntakeByPid_(intakeSheet, pid) {
  if (!intakeSheet || !pid) return false;

  // Z列(patient_id) でヒットする行番号だけ取得（TextFinder）
  const rows = findRowsByPidInIntake_(intakeSheet, pid);
  if (!rows || rows.length === 0) return false;

  // 新しい行を優先（末尾から）
  // C列 = submittedAt（0-based index 2）
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    const submittedAt = String(
      intakeSheet.getRange(r, 3).getValue() || "" // C列
    ).trim();
    if (submittedAt) return true;
  }
  return false;
}
// ★ 最適化版：必要な payment_id だけ読み取る（全件読み取りしない）
function getShippingIndexMapForPaymentIds_(paymentIds, perfLog) {
  if (!paymentIds || paymentIds.length === 0) return {};

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName("shipping_index");
  if (!sh) return {};

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return {};

  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const col = (name) => header.indexOf(name) + 1;

  const cPay = col("payment_id");
  const cTn  = col("tracking_number");
  const cSt  = col("shipping_status");
  const cDt  = col("shipping_date");
  const cCar = col("carrier");

  if (!cPay) return {};

  const map = {};

  // ★ 各 payment_id を TextFinder で検索（必要な行だけ読む）
  for (let i = 0; i < paymentIds.length; i++) {
    const payId = String(paymentIds[i] || "").trim();
    if (!payId) continue;

    const rng = sh.getRange(2, cPay, lastRow - 1, 1);
    const cell = rng.createTextFinder(payId).matchEntireCell(true).findNext();
    if (!cell) continue;

    const r = cell.getRow();
    const needCols = Math.max(cPay, cTn || 0, cSt || 0, cDt || 0, cCar || 0);
    const row = sh.getRange(r, 1, 1, needCols).getValues()[0];

    const tracking = cTn ? String(row[cTn - 1] || "").trim() : "";
    const st = cSt ? String(row[cSt - 1] || "").trim() : "";
    const dtV = cDt ? row[cDt - 1] : "";
    const carrier = cCar ? String(row[cCar - 1] || "").trim() : "";

    let dt = "";
    if (dtV instanceof Date) dt = Utilities.formatDate(dtV, "Asia/Tokyo", "yyyy-MM-dd");
    else if (dtV) dt = String(dtV).trim();

    map[payId] = {
      tracking_number: tracking,
      shipping_status: st,
      shipping_date: dt,
      carrier: carrier,
    };
  }

  return map;
}

// ★ 旧実装（全件読み取り）- 互換性のため残す（使われていない）
function getShippingIndexMap_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName("shipping_index");
  if (!sh) return {};

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return {};

  const header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const col = (name) => header.indexOf(name) + 1;

  const cPay  = col("payment_id");
  const cTn   = col("tracking_number");
  const cSt   = col("shipping_status");
  const cDt   = col("shipping_date");
  const cCar  = col("carrier");

  if (!cPay) return {};

  const values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const map = {};
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const pay = String(row[cPay - 1] || "").trim();
    if (!pay) continue;

    const tracking = cTn ? String(row[cTn - 1] || "").trim() : "";
    const st = cSt ? String(row[cSt - 1] || "").trim() : "";
    const dtV = cDt ? row[cDt - 1] : "";
    const carrier = cCar ? String(row[cCar - 1] || "").trim() : "";

    let dt = "";
    if (dtV instanceof Date) dt = Utilities.formatDate(dtV, "Asia/Tokyo", "yyyy-MM-dd");
    else if (dtV) dt = String(dtV).trim();

    map[pay] = {
      tracking_number: tracking,
      shipping_status: st,
      shipping_date: dt,
      carrier: carrier,
    };
  }

  return map;
}
// =====================
// 過去分バックフィル：のなめマスター → 問診ブック shipping_index
// =====================
function backfillShippingIndexFromNonameMasterOnce() {
  const props = PropertiesService.getScriptProperties();
  const masterSheetId = props.getProperty("NONAME_MASTER_SHEET_ID");
  const masterSheetName = props.getProperty("NONAME_MASTER_SHEET_NAME") || "のなめマスター";
  if (!masterSheetId) throw new Error("NONAME_MASTER_SHEET_ID not set");

  // 1) のなめマスターを読む（必要列だけ）
  const mss = SpreadsheetApp.openById(masterSheetId);
  const ms = mss.getSheetByName(masterSheetName);
  if (!ms) throw new Error("noname master sheet not found: " + masterSheetName);

  const mLast = ms.getLastRow();
  if (mLast < 2) {
    Logger.log("no rows in noname master");
    return;
  }

  // Q=payment_id(17), T=shipping_status(20), U=shipping_date(21), V=tracking_number(22)
  // 17..22（Q..V）をまとめて取得
  const mBlock = ms.getRange(2, 17, mLast - 1, 6).getValues(); // [Q,R,S,T,U,V]

  // payment_id -> 最新の shipping info（後勝ち）
  const map = {};
  for (let i = 0; i < mBlock.length; i++) {
    const pay = String(mBlock[i][0] || "").trim(); // Q
    if (!pay) continue;

    const shipStatus = String(mBlock[i][3] || "").trim(); // T
    const shipDateV  = mBlock[i][4];                      // U
    const tracking   = String(mBlock[i][5] || "").trim(); // V

    // tracking が無いものは shipping_index に入れても意味が薄いのでスキップ（必要なら条件変更OK）
    if (!tracking) continue;

    let shipDateStr = "";
    if (shipDateV instanceof Date) shipDateStr = Utilities.formatDate(shipDateV, "Asia/Tokyo", "yyyy-MM-dd");
    else if (shipDateV) shipDateStr = String(shipDateV).trim();

    map[pay] = { tracking_number: tracking, shipping_status: shipStatus, shipping_date: shipDateStr };
  }

  // 2) 問診ブック shipping_index を upsert
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName("shipping_index");
  if (!sh) sh = ss.insertSheet("shipping_index");

  // ヘッダ保証
  if (sh.getLastRow() < 1) {
    sh.getRange(1, 1, 1, 6).setValues([[
      "payment_id",
      "tracking_number",
      "shipping_status",
      "shipping_date",
      "carrier",
      "updated_at",
    ]]);
  }

  const lastCol = Math.max(sh.getLastColumn(), 6);
  const header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const col = (name) => header.indexOf(name) + 1;

  const cPay = col("payment_id") || 1;
  const cTn  = col("tracking_number") || 2;
  const cSt  = col("shipping_status") || 3;
  const cDt  = col("shipping_date") || 4;
  const cCar = col("carrier") || 5;
  const cUp  = col("updated_at") || 6;

  // 既存 index を map化（payment_id -> row）
  const sLast = sh.getLastRow();
  const existing = {};
  if (sLast >= 2) {
    const pays = sh.getRange(2, cPay, sLast - 1, 1).getValues();
    for (let i = 0; i < pays.length; i++) {
      const pay = String(pays[i][0] || "").trim();
      if (!pay) continue;
      existing[pay] = i + 2;
    }
  }

  const nowStr = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");

  // 書き込み（更新は setValues でまとめたいので、まず更新行は個別、追加は append 配列）
  const toAppend = [];

  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i++) {
    const pay = keys[i];
    const v = map[pay];

    const hitRow = existing[pay] || 0;
    if (!hitRow) {
      const row = new Array(lastCol).fill("");
      row[cPay - 1] = pay;
      row[cTn - 1]  = v.tracking_number || "";
      row[cSt - 1]  = v.shipping_status || "";
      row[cDt - 1]  = v.shipping_date || "";
      row[cCar - 1] = ""; // carrier は後で埋めたければ
      row[cUp - 1]  = nowStr;
      toAppend.push(row);
      continue;
    }

    // 既存更新（空は上書きしない）
    if (v.tracking_number) sh.getRange(hitRow, cTn).setValue(v.tracking_number);
    if (v.shipping_status) sh.getRange(hitRow, cSt).setValue(v.shipping_status);
    if (v.shipping_date) sh.getRange(hitRow, cDt).setValue(v.shipping_date);
    sh.getRange(hitRow, cUp).setValue(nowStr);
  }

  if (toAppend.length > 0) {
    sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, lastCol).setValues(toAppend);
  }

  Logger.log("backfillShippingIndexFromNonameMasterOnce done: upsert=" + keys.length + " append=" + toAppend.length);
}
function backfillIntakeReservationFieldsOnce() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rSh = ss.getSheetByName(SHEET_NAME_RESERVE); // "予約"
  const iSh = ss.getSheetByName(SHEET_NAME_INTAKE);  // "問診"
  if (!rSh || !iSh) throw new Error("missing sheets");

  // ---- 1) 予約：PID -> 最新の有効予約を作る（キャンセル除外、後勝ち）----
  const rLast = rSh.getLastRow();
  if (rLast < 2) return;

  const rVals = rSh.getRange(2, 1, rLast - 1, 7).getDisplayValues();
  // [A ts, B reserveId, C pid, D name, E date, F time, G status]

  const pidToResv = {};
  for (let i = 0; i < rVals.length; i++) {
// rVals: getDisplayValues() なので 0-based
const reserveId = String(rVals[i][1] || "").trim(); // B
const pid       = normalizePid_(rVals[i][2]);      // C
const date      = String(rVals[i][4] || "").trim(); // E
const time      = String(rVals[i][5] || "").trim(); // F
const st        = String(rVals[i][6] || "").trim(); // G

    if (!reserveId || !pid) continue;
    if (st === "キャンセル") continue;
    if (!date || !time) continue;

    pidToResv[pid] = { reserveId, date, time }; // 後勝ち＝最新
  }

  // ---- 2) 問診：対象行（submittedAt優先・末尾優先）を PID -> index で作る ----
  const iLast = iSh.getLastRow();
  if (iLast < 2) return;

  const num = iLast - 1;

const pidCol = iSh.getRange(2, COL_PATIENT_ID_INTAKE, num, 1).getValues(); // Z
const subCol = iSh.getRange(2, 3, num, 1).getValues();                    // C submittedAt

const bCol = iSh.getRange(2, COL_RESERVE_ID_INTAKE, num, 1).getValues();       // B
const hCol = iSh.getRange(2, COL_RESERVED_DATE_INTAKE, num, 1).getValues();    // H
const tCol = iSh.getRange(2, COL_RESERVED_TIME_INTAKE, num, 1).getValues();    // I

  const pidToRow = {};
  for (let idx = 0; idx < num; idx++) {
    const pid = normalizePid_(pidCol[idx][0]);
    if (!pid) continue;

    const submitted = String(subCol[idx][0] || "").trim();
    const cur = pidToRow[pid];

    if (!cur) {
      pidToRow[pid] = { idx, hasSubmitted: !!submitted };
      continue;
    }

    const curBetter = cur.hasSubmitted;
    const nowBetter = !!submitted;

    // submittedAtありを優先。条件同じなら後勝ち（末尾優先）
    if ((nowBetter && !curBetter) || (nowBetter === curBetter)) {
      pidToRow[pid] = { idx, hasSubmitted: nowBetter || cur.hasSubmitted };
    }
  }

  // ---- 3) 同期（変更追従：不一致なら上書き）----
  let updated = 0;
  Object.keys(pidToResv).forEach((pid) => {
    const target = pidToRow[pid];
    if (!target) return;

    const idx = target.idx;
    const resv = pidToResv[pid];

    const curB = String(bCol[idx][0] || "").trim();
    const curH = String(hCol[idx][0] || "").trim();
    const curT = String(tCol[idx][0] || "").trim();

    let changed = false;

    if (curB !== resv.reserveId) { bCol[idx][0] = resv.reserveId; changed = true; }
    if (curH !== resv.date)      { hCol[idx][0] = resv.date;      changed = true; }
    if (curT !== resv.time)      { tCol[idx][0] = resv.time;      changed = true; }

    if (changed) updated++;
  });

  // ---- 4) 予約が無いPIDはクリア（キャンセル追従の取りこぼし回収）----
  let cleared = 0;
  Object.keys(pidToRow).forEach((pid) => {
    if (pidToResv[pid]) return; // 予約ありは対象外

    const idx = pidToRow[pid].idx;
    const curB = String(bCol[idx][0] || "").trim();
    const curH = String(hCol[idx][0] || "").trim();
    const curT = String(tCol[idx][0] || "").trim();
    if (!curB && !curH && !curT) return;

    bCol[idx][0] = "";
    hCol[idx][0] = "";
    tCol[idx][0] = "";
    cleared++;
  });

  // ---- 5) 書き戻し（まとめて）----
  if (updated > 0 || cleared > 0) {
    iSh.getRange(2, COL_RESERVE_ID_INTAKE, num, 1).setValues(bCol);
    iSh.getRange(2, COL_RESERVED_DATE_INTAKE, num, 1).setValues(hCol);
    iSh.getRange(2, COL_RESERVED_TIME_INTAKE, num, 1).setValues(tCol);
  }

  Logger.log("backfillIntakeReservationFieldsOnce sync: updated=" + updated + " cleared=" + cleared);
}

