const TZ = "Asia/Tokyo";

// ソース（問診ブック）
const SRC_SPREADSHEET_ID = "1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo";
const SRC_SHEET_INTAKE = "問診";

// 予約ビュー側
const VIEW_SHEET = "予約ビュー";

// 補完タグ（CSV用）
const REMIND_TAG_COL = "タグ_9321522";
const TAG_OUTPUT_SHEET = "Lステタグ用CSV";

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📌 予約ビュー")
    .addItem("① 付帯情報を更新（LステID/不通/OKNG/処方/リンク）", "enrichReservationView")
    .addItem("② タグCSV作成（診療リマインド）", "generateRemindTagCsvFromView")
    .addItem("③ 作成→SJISダウンロード（診療リマインド）", "generateAndDownload_RemindTagCSV")
    .addToUi();
}

/**
 * 予約ビューの各行に、問診から情報を突合して右列に埋める
 */
function enrichReservationView() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(VIEW_SHEET);
  if (!sh) throw new Error(`シートが見つかりません: ${VIEW_SHEET}`);

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return;

  // 予約ビューの列（A:Gが予約の同期結果）
  // A timestamp, B reserveId, C PatientID, D name, E date, F time, G status
  const COL_RESERVE_ID = 2; // B
  const COL_NAME = 4;       // D

  // 右側の出力列（H〜）
  // H lstep_id, I doctor_status, J call_status, K prescription_menu, L name_link
  const OUT_COL_LSTEP = 8;        // H
  const OUT_COL_DOC_STATUS = 9;   // I
  const OUT_COL_CALL = 10;        // J
  const OUT_COL_MENU = 11;        // K
  const OUT_COL_NAME_LINK = 12;   // L

  // --- 問診ブックから辞書作成 ---
  const srcSS = SpreadsheetApp.openById(SRC_SPREADSHEET_ID);
  const intakeSh = srcSS.getSheetByName(SRC_SHEET_INTAKE);
  if (!intakeSh) throw new Error(`問診ブックに「${SRC_SHEET_INTAKE}」が見つかりません`);

  const maps = buildIntakeMapsFixed_(intakeSh);

  // --- 予約ビューを読む（必要列だけ） ---
  const viewVals = sh.getRange(2, 1, lastRow - 1, Math.max(lastCol, OUT_COL_NAME_LINK)).getValues();

  // 出力配列
  const outLstep = [];
  const outDocSt = [];
  const outCall  = [];
  const outMenu  = [];
  const outLink  = [];

  for (let i = 0; i < viewVals.length; i++) {
    const row = viewVals[i];

    const reserveId = String(row[COL_RESERVE_ID - 1] || "").trim();
    const name = String(row[COL_NAME - 1] || "").trim();

    const hit = reserveId ? maps.byReserveId.get(reserveId) : null;

    const lstepId = hit ? (hit.lstepId || "") : "";
    const doctorStatus = hit ? (hit.doctorStatus || "") : "";
    const callStatus = hit ? (hit.callStatus || "") : "";
    const menu = hit ? (hit.menu || "") : "";

    outLstep.push([lstepId]);
    outDocSt.push([doctorStatus]);
    outCall.push([callStatus]);
    outMenu.push([menu]);

    // name_linkは別列に式を入れる（IMPORTRANGE列は触らない）
    // member=【LステップID】、表示は氏名
    const r = i + 2; // 実シート行
    const safeName = escapeForFormula_(name || "");
    const formula = `=IF($H${r}<>"",HYPERLINK("https://manager.linestep.net/line/visual?member="&$H${r},"${safeName}"),"${safeName}")`;
    outLink.push([formula]);
  }

  // --- 一括書き込み ---
  const n = viewVals.length;
  sh.getRange(2, OUT_COL_LSTEP, n, 1).setValues(outLstep);
  sh.getRange(2, OUT_COL_DOC_STATUS, n, 1).setValues(outDocSt);
  sh.getRange(2, OUT_COL_CALL, n, 1).setValues(outCall);
  sh.getRange(2, OUT_COL_MENU, n, 1).setValues(outMenu);

  // name_link は setFormulas が必要
  sh.getRange(2, OUT_COL_NAME_LINK, n, 1).setFormulas(outLink);

  SpreadsheetApp.getUi().alert(`✅ 付帯情報を更新しました（${n}件）`);
}

/**
 * 問診シート（固定ヘッダ）から辞書を作る
 * - 最新行優先（下の行を採用）
 * - byReserveId: reserveId -> {lstepId, doctorStatus, callStatus, menu}
 */
function buildIntakeMapsFixed_(intakeSh) {
  const lastRow = intakeSh.getLastRow();
  const lastCol = intakeSh.getLastColumn();
  if (lastRow < 2) return { byReserveId: new Map() };

  // 固定ヘッダ（あなたが提示した順）
  // A timestamp
  // B reserveId
  // ...
  // T status
  // V prescription_menu
  // Y answerer_id
  // AE call_status
  const COL_RESERVE_ID = 2;
  const COL_STATUS = 20;
  const COL_MENU = 22;
  const COL_ANSWERER = 25;
  const COL_CALL = 31;

  const vals = intakeSh.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

  const byReserveId = new Map();

  // 最新行優先：下から
  for (let i = vals.length - 1; i >= 0; i--) {
    const row = vals[i];
    const reserveId = String(row[COL_RESERVE_ID - 1] || "").trim();
    if (!reserveId) continue;
    if (byReserveId.has(reserveId)) continue;

    byReserveId.set(reserveId, {
      lstepId: String(row[COL_ANSWERER - 1] || "").trim(),     // answerer_id
      doctorStatus: String(row[COL_STATUS - 1] || "").trim(), // status (OK/NGなど)
      callStatus: String(row[COL_CALL - 1] || "").trim(),     // call_status
      menu: String(row[COL_MENU - 1] || "").trim(),           // prescription_menu
    });
  }

  return { byReserveId };
}

/**
 * 予約ビューから「診療リマインド」タグCSVを作成（タグ_9321522）
 * - lstep_id（H列）から登録IDを収集
 * - 2行ヘッダ、3行目からデータ
 */
function generateRemindTagCsvFromView() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(VIEW_SHEET);
  if (!sh) throw new Error(`シートが見つかりません: ${VIEW_SHEET}`);

  const lastRow = sh.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("予約ビューにデータがありません。");
    return;
  }

  const COL_LSTEP = 8; // H
  const ids = sh.getRange(2, COL_LSTEP, lastRow - 1, 1).getDisplayValues().flat()
    .map(s => String(s || "").trim())
    .filter(s => /^\d+$/.test(s)); // 登録IDは数値想定

  const uniq = Array.from(new Set(ids));
  if (uniq.length === 0) {
    SpreadsheetApp.getUi().alert("対象のlstep_id（登録ID）がありません。先に「付帯情報更新」を実行してください。");
    return;
  }

  let dest = ss.getSheetByName(TAG_OUTPUT_SHEET);
  if (!dest) dest = ss.insertSheet(TAG_OUTPUT_SHEET);
  dest.clearContents();

  const out = [];
  out.push(["登録ID", REMIND_TAG_COL]);
  out.push(["ID", "診療リマインド"]);
  for (const id of uniq) out.push([id, "1"]);

  dest.getRange(1, 1, out.length, 2).setValues(out);
  dest.autoResizeColumns(1, 2);

  SpreadsheetApp.getUi().alert(`✅ タグCSVを作成しました（${uniq.length}件）`);
}

function generateAndDownload_RemindTagCSV() {
  generateRemindTagCsvFromView();
  downloadSJIS_RemindTagCSV();
}

function downloadSJIS_RemindTagCSV() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(TAG_OUTPUT_SHEET);
  if (!sh) {
    SpreadsheetApp.getUi().alert(`「${TAG_OUTPUT_SHEET}」がありません。`);
    return;
  }
  const values = sh.getDataRange().getValues();
  if (!values || values.length === 0) {
    SpreadsheetApp.getUi().alert("データがありません。");
    return;
  }

  const csv = toCsvAlwaysQuoted_(values);
  const bytes = Utilities.newBlob("").setDataFromString(csv, "Shift_JIS").getBytes();
  const b64 = Utilities.base64Encode(bytes);
  const filename = `lstep_tag_${Utilities.formatDate(new Date(), TZ, "yyyyMMdd_HHmmss")}.csv`;

  const html = HtmlService.createHtmlOutput(
    `<!doctype html><html><head><meta charset="utf-8"></head><body>
      <h3>CSV（Shift-JIS）ダウンロード</h3>
      <p>ファイル名：${escapeHtml_(filename)}</p>
      <a href="data:text/csv;base64,${b64}" download="${escapeHtml_(filename)}">▶ ダウンロード</a>
    </body></html>`
  ).setWidth(520).setHeight(200);

  SpreadsheetApp.getUi().showModalDialog(html, "タグCSVダウンロード");
}

// --- small helpers ---
function toCsvAlwaysQuoted_(rows) {
  return rows
    .map(row =>
      row.map(cell => {
        const v = cell === null || cell === undefined ? "" : String(cell);
        return `"${v.replace(/"/g, '""')}"`;
      }).join(",")
    )
    .join("\r\n");
}

function escapeHtml_(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeForFormula_(s) {
  return String(s || "").replace(/"/g, '""');
}
