function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu("📦 発送")
    .addItem("① 日本郵便追跡CSV → 当日発送シートへ追跡番号を付与（氏名＋メール）", "applyTrackingFromJapanPostSheet")
    .addItem("② ヤマト追跡CSV → 当日発送シートへ追跡番号を付与（お客様管理番号=payment_id）", "applyTrackingFromYamatoSheet")
    .addSeparator()
    .addItem("③ 当日発送シート → のなめマスターへ反映（payment_id）", "pushTodaySheetToNonameMaster")
    .addItem("④ ヤマトB2：当日シートからCSV作成", "yamatoB2_makeCsvFromActiveSheet")
    .addToUi();

  ui.createMenu("🏷 Lステタグ")
    .addItem("① タグCSV作成（登録ID→タグ）", "generateLstepTagCsvSheet")
    .addItem("② SJISダウンロード（タグCSV）", "downloadSJIS_TagCSV")
    .addItem("③ 作成→SJISダウンロード（タグCSV）", "generateAndDownload_TagCSV")
    .addToUi();
}

const JP_TRACKING_SHEET_NAME = "日本郵便追跡CSV";
const YAMATO_TRACKING_SHEET_NAME = "ヤマト追跡CSV";

const TRACKING_SHEET_NAME = "追跡CSV"; // 追跡CSVを貼るシート名（発送ブック内）

function applyTrackingToTodaySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const todaySheet = ss.getActiveSheet(); // ★当日発送シートをアクティブにして実行
  const trackingSheet = ss.getSheetByName(TRACKING_SHEET_NAME);

  if (!trackingSheet) {
    SpreadsheetApp.getUi().alert("追跡CSVシートが見つかりません: " + TRACKING_SHEET_NAME);
    return;
  }

  const tLastRow = trackingSheet.getLastRow();
  const sLastRow = todaySheet.getLastRow();
  if (tLastRow < 2) {
    SpreadsheetApp.getUi().alert("追跡CSVにデータがありません（ヘッダーの下に貼ってください）。");
    return;
  }
  if (sLastRow < 2) {
    SpreadsheetApp.getUi().alert("当日発送シートにデータがありません。");
    return;
  }

  // =========================
  // 追跡CSV：ヘッダー取得 & 判定
  // =========================
  const tHeaderRaw = trackingSheet.getRange(1, 1, 1, trackingSheet.getLastColumn()).getValues()[0];
  const tHeaderNorm = tHeaderRaw.map(h => normalizeHeader_(h));

  const isYamato =
    tHeaderNorm.indexOf("お客様管理番号") >= 0 &&
    (tHeaderNorm.indexOf("伝票番号") >= 0 || tHeaderNorm.indexOf("お問い合わせ番号") >= 0);

  // 追跡CSVデータ
  const tValues = trackingSheet
    .getRange(2, 1, tLastRow - 1, trackingSheet.getLastColumn())
    .getValues();

  // =========================
  // 当日発送シート：列特定
  // =========================
  const sHeader = todaySheet.getRange(1, 1, 1, todaySheet.getLastColumn()).getValues()[0].map(h => String(h || "").trim());

  const S_COL_NAME     = findColAny_(sHeader, ["Name", "氏名"]);
  const S_COL_EMAIL    = findColAny_(sHeader, ["Email", "メール", "電子メールアドレス"]);
  const S_COL_PAYMENT  = findColAny_(sHeader, ["payment_id", "paymentId", "決済ID"]);
  const S_COL_TRACKING = findColAny_(sHeader, ["tracking_number", "追跡番号"]);

  if (S_COL_TRACKING < 0) {
    SpreadsheetApp.getUi().alert("当日発送シートに tracking_number（追跡番号）列が見つかりません。");
    return;
  }

  const sColCount = todaySheet.getLastColumn();
  const sRange = todaySheet.getRange(2, 1, sLastRow - 1, sColCount);
  const sValues = sRange.getValues();

  // =========================
  // 追跡CSV → map 作成
  // =========================
  let modeLabel = "";
  const map = {}; // key -> tracking

  if (isYamato) {
    modeLabel = "ヤマト（お客様管理番号=payment_id）";

    const T_COL_PAYMENT = findColAnyNorm_(tHeaderNorm, ["お客様管理番号"]);
    const T_COL_TRACKING = findColAnyNorm_(tHeaderNorm, ["伝票番号", "お問い合わせ番号", "追跡番号"]);

    if (T_COL_PAYMENT < 0 || T_COL_TRACKING < 0) {
      SpreadsheetApp.getUi().alert(
        "ヤマト追跡CSVの必要列が見つかりません。\n必要：お客様管理番号 / 伝票番号（またはお問い合わせ番号）"
      );
      return;
    }
    if (S_COL_PAYMENT < 0) {
      SpreadsheetApp.getUi().alert("当日発送シートに payment_id 列が見つかりません（ヤマト突合に必須）。");
      return;
    }

    for (const row of tValues) {
      const pay = String(row[T_COL_PAYMENT] || "").trim();
      const tracking = String(row[T_COL_TRACKING] || "").trim();
      if (!pay || !tracking) continue;
      map[pay] = tracking;
    }

    // =========================
    // 当日発送：payment_idで付与
    // =========================
    let updated = 0, notFound = 0, skippedAlready = 0;

    for (let i = 0; i < sValues.length; i++) {
      const row = sValues[i];

      const existing = String(row[S_COL_TRACKING] || "").trim();
      if (existing) { skippedAlready++; continue; }

      const pay = String(row[S_COL_PAYMENT] || "").trim();
      if (!pay) continue;

      const tracking = map[pay];
      if (!tracking) { notFound++; continue; }

      row[S_COL_TRACKING] = tracking;
      updated++;
    }

    if (updated > 0) sRange.setValues(sValues);

    SpreadsheetApp.getUi().alert(
      `【${modeLabel}】\n追跡番号を ${updated} 件付与しました。\n既に追跡ありスキップ ${skippedAlready} 件\npayment_id未一致 ${notFound} 件`
    );
    return;
  }

  // -------------------------
  // 日本郵便モード（Name+Email）
  // -------------------------
  modeLabel = "日本郵便（氏名+メール）";

  const T_COL_TRACKING = findColAnyNorm_(tHeaderNorm, ["追跡番号"]);
  const T_COL_NAME     = findColAnyNorm_(tHeaderNorm, ["お届け先／お名前"]);
  const T_COL_EMAIL    = findColAnyNorm_(tHeaderNorm, ["お届け先／電子メールアドレス"]);

  if (T_COL_TRACKING < 0 || T_COL_NAME < 0 || T_COL_EMAIL < 0) {
    SpreadsheetApp.getUi().alert(
      "追跡CSVの必要列が見つかりません。\n日本郵便形式は 必要：追跡番号 / お届け先／お名前 / お届け先／電子メールアドレス\n（ヤマト形式なら お客様管理番号/伝票番号 が必要）"
    );
    return;
  }
  if (S_COL_NAME < 0 || S_COL_EMAIL < 0) {
    SpreadsheetApp.getUi().alert("当日発送シートに Name / Email 列が見つかりません（日本郵便突合に必須）。");
    return;
  }

  for (const row of tValues) {
    const tracking = String(row[T_COL_TRACKING] || "").trim();
    if (!tracking) continue;

    const name  = normalizeName_(row[T_COL_NAME]);
    const email = normalizeEmail_(row[T_COL_EMAIL]);
    if (!name || !email) continue;

    map[name + "|" + email] = tracking;
  }

  let updated = 0, notFound = 0, skippedAlready = 0;

  for (let i = 0; i < sValues.length; i++) {
    const row = sValues[i];

    const existing = String(row[S_COL_TRACKING] || "").trim();
    if (existing) { skippedAlready++; continue; }

    const name  = normalizeName_(row[S_COL_NAME]);
    const email = normalizeEmail_(row[S_COL_EMAIL]);
    if (!name || !email) continue;

    const tracking = map[name + "|" + email];
    if (!tracking) { notFound++; continue; }

    row[S_COL_TRACKING] = tracking;
    updated++;
  }

  if (updated > 0) sRange.setValues(sValues);

  SpreadsheetApp.getUi().alert(
    `【${modeLabel}】\n追跡番号を ${updated} 件付与しました。\n既に追跡ありスキップ ${skippedAlready} 件\n未一致 ${notFound} 件`
  );
}


/***************
 * ヘルパー
 ***************/

function normalizeName_(v) {
  return String(v || "")
    .normalize("NFKC")          // ★全角英数 → 半角英数 / 互換正規化
    .replace(/　/g, " ")        // 念のため全角スペース → 半角
    .replace(/\s+/g, " ")       // 連続スペース圧縮
    .replace(/様/g, "")         // 様除去
    .trim()
    .toLowerCase()              // ★英字の大小差も吸収（日本語には影響なし）
    .replace(/[.,・･，]/g, "")  // ★よく混ざる記号を除去（任意だが強い）
    .replace(/\s/g, "");        // ★スペース差でズレるのも吸収（John Doe vs JohnDoe）
}


function normalizeEmail_(v) {
  return String(v || "").trim().toLowerCase();
}

const MASTER_SPREADSHEET_ID = "1FrFXCfwP7BqW5Bp-EP27TzydPoRmHp6Hw2eYAIcXzMI"; // ★要変更
const MASTER_SHEET_NAME = "のなめマスター"; // ★必要なら変更
const TZ = "Asia/Tokyo";

/**
 * アクティブな当日発送シートの tracking_number を
 * のなめマスターへ payment_id で書き戻す（式を壊さない版）
 * - tracking_number が入っている行だけ対象
 * - マスター側に既に tracking_number がある場合はスキップ（上書きしない）
 * - shipping_status = "shipped"
 * - shipping_date = シート名から推定 or 今日
 */
function pushTodaySheetToNonameMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const todaySheet = ss.getActiveSheet();

  const sLastRow = todaySheet.getLastRow();
  if (sLastRow < 2) {
    SpreadsheetApp.getUi().alert("当日発送シートにデータがありません。");
    return;
  }

  // 当日発送シート：ヘッダ
  const sHeader = todaySheet.getRange(1, 1, 1, todaySheet.getLastColumn()).getValues()[0];
  const S_COL_PAYMENT_ID   = findColAny_(sHeader, ["payment_id", "paymentId", "決済ID"]);
  const S_COL_TRACKING_NUM = findColAny_(sHeader, ["tracking_number", "追跡番号"]);

  if (S_COL_PAYMENT_ID < 0 || S_COL_TRACKING_NUM < 0) {
    SpreadsheetApp.getUi().alert("当日発送シートに payment_id / tracking_number 列が見つかりません。");
    return;
  }

  // 当日発送データ
  const sColCount = todaySheet.getLastColumn();
  const sValues = todaySheet.getRange(2, 1, sLastRow - 1, sColCount).getValues();

  // payment_id -> tracking のMap
  const payToTracking = new Map();
  for (const row of sValues) {
    const pay = normalizeKey_(row[S_COL_PAYMENT_ID]);
    const tracking = String(row[S_COL_TRACKING_NUM] || "").trim();
    if (!pay || !tracking) continue;
    payToTracking.set(pay, tracking);
  }
  if (payToTracking.size === 0) {
    SpreadsheetApp.getUi().alert("当日発送シートに反映対象（payment_id + tracking_number）がありません。");
    return;
  }

  // shipping_date 推定
  const shipDate =
    guessDateFromSheetName_(todaySheet.getName()) ||
    Utilities.formatDate(new Date(), TZ, "yyyy/MM/dd");

  // マスターを開く
  const masterSS = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  const masterSheet = masterSS.getSheetByName(MASTER_SHEET_NAME);
  if (!masterSheet) {
    SpreadsheetApp.getUi().alert("のなめマスター シートが見つかりません: " + MASTER_SHEET_NAME);
    return;
  }

  const mLastRow = masterSheet.getLastRow();
  if (mLastRow < 2) {
    SpreadsheetApp.getUi().alert("のなめマスターにデータがありません。");
    return;
  }

  // ✅ のなめマスター：列固定（1-based）
  // Q=payment_id, T=shipping_status, U=shipping_date, V=tracking_number
  const M_COL_PAYMENT_ID_1B   = 17; // Q列
  const M_COL_SHIP_STATUS_1B  = 20; // T列
  const M_COL_SHIP_DATE_1B    = 21; // U列
  const M_COL_TRACKING_NUM_1B = 22; // V列

  const n = mLastRow - 1; // 2行目〜の行数

  // デバッグ（必要な間だけ）
  const samplePay = payToTracking.keys().next().value;
  const sampleMaster5 = masterSheet
    .getRange(2, M_COL_PAYMENT_ID_1B, Math.min(5, n), 1)
    .getValues()
    .flat()
    .map(normalizeKey_);
  Logger.log("MASTER sheet=" + masterSheet.getName());
  Logger.log("today samplePay=" + samplePay);
  Logger.log("master payment_id sample5=" + JSON.stringify(sampleMaster5));
  Logger.log("existsInSample5? " + (sampleMaster5.indexOf(samplePay) >= 0));

  // 必要列だけ読む
  const payColVals = masterSheet.getRange(2, M_COL_PAYMENT_ID_1B, n, 1).getValues();
  const trkColVals = masterSheet.getRange(2, M_COL_TRACKING_NUM_1B, n, 1).getValues();

  // payment_id -> 行index（0-based）
  const payToIdx = new Map();
  for (let i = 0; i < n; i++) {
    const pay = normalizeKey_(payColVals[i][0]);
    if (pay) payToIdx.set(pay, i);
  }

let updated = 0;
let skippedAlready = 0;
let notFound = 0;

// ★今回「追跡を新規で入れた」payment_idを記録
const touchedPays = [];

// tracking列の更新用配列（既存保持）
const newTracking = trkColVals.map(r => [r[0]]);

for (const [pay, tracking] of payToTracking.entries()) {
  const idx = payToIdx.get(pay);
  if (idx == null) {
    notFound++;
    continue;
  }

  // ここは「更新前のtracking」で判定してOK（新規付与だけ拾いたい）
  const existing = String(trkColVals[idx][0] || "").trim();
  if (existing) {
    skippedAlready++;
    continue;
  }

  newTracking[idx][0] = tracking;
  touchedPays.push(pay);
  updated++;
}

if (updated > 0) {
  // tracking_number を一括反映
  masterSheet.getRange(2, M_COL_TRACKING_NUM_1B, n, 1).setValues(newTracking);

  // shipping_status / shipping_date / shipping_index は「今回更新した行だけ」
  for (const pay of touchedPays) {
    const idx = payToIdx.get(pay);
    if (idx == null) continue;

    const rowNumber = 2 + idx;

    masterSheet.getRange(rowNumber, M_COL_SHIP_STATUS_1B).setValue("shipped");
    masterSheet.getRange(rowNumber, M_COL_SHIP_DATE_1B).setValue(shipDate);

    // ★shipping_index（問診ブック）へ upsert
    // tracking は payToTracking に入っている前提
    const tracking = payToTracking.get(pay);
    // carrier は暫定で yamato（日本郵便も扱うならここを分岐）
    upsertShippingIndexToIntakeBook_(pay, tracking, "shipped", shipDate, "yamato");
  }

  // ★★★ ここ（マスター更新が終わった直後） ★★★
  invalidateMypageCache_();
}

SpreadsheetApp.getUi().alert(
  "反映完了：更新 " + updated +
  " 件 / 既に追跡ありでスキップ " + skippedAlready +
  " 件 / payment_id不一致 " + notFound + " 件"
);
}


/***************
 * ヘルパー
 ***************/

function guessDateFromSheetName_(name) {
  const s = String(name || "");

  // 発送_2025-12-12 / 2025-12-12
  let m = s.match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;

  // 20251212
  m = s.match(/(20\d{2})(\d{2})(\d{2})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;

  // 12/12（年が無いので今年扱い）
  m = s.match(/(\d{1,2})\/(\d{1,2})/);
  if (m) {
    const y = Utilities.formatDate(new Date(), TZ, "yyyy");
    const mm = ("0" + m[1]).slice(-2);
    const dd = ("0" + m[2]).slice(-2);
    return `${y}/${mm}/${dd}`;
  }

  return "";
}

// =========================
// 🏷 タグ一括付与（登録ID→タグ）CSV
//   - 2列: 登録ID, タグ_9217653
//   - Shift-JIS ダウンロード（既存download_dialog.html流用）
// =========================

const TAG_ATTR_ID = "9217653"; // ← タグID
const TAG_SOURCE_SHEET = "発送対象CSV（Lステ）"; // 登録IDの元
const TAG_OUTPUT_SHEET = "Lステタグ用CSV"; // 出力先


/**
 * 登録ID一覧から「登録ID」「タグ_9217653」の2列CSVデータを作成してシートに出力
 * - 2行ヘッダ形式（あなたの属性CSVと同じ）
 * - 3行目からデータ
 */
function generateLstepTagCsvSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ① 元データは「いま見ているシート」
  let src = ss.getActiveSheet();

  // もし出力シートを見てる状態で押しちゃった時の保険（任意）
  if (src.getName() === TAG_OUTPUT_SHEET) {
    const fallback = ss.getSheetByName(TAG_SOURCE_SHEET);
    if (!fallback) throw new Error(`シートが見つかりません: ${TAG_SOURCE_SHEET}`);
    src = fallback;
  }

  // 出力先
  const dest = ss.getSheetByName(TAG_OUTPUT_SHEET) || ss.insertSheet(TAG_OUTPUT_SHEET);

  const lastRow = src.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("元シートにデータがありません。");
    return;
  }

  // ② A列2行目以降を読む（ただし "ID" など数値でない行は除外）
  const colA = src.getRange(2, 1, lastRow - 1, 1).getValues(); // A2:A
  const ids = [];
  for (let i = 0; i < colA.length; i++) {
    const v = String(colA[i][0] || "").trim();
    if (!v) continue;
    if (!/^\d+$/.test(v)) continue; // ← "ID" 等を弾く（不要行対策）
    ids.push(v);
  }
  const uniq = Array.from(new Set(ids));

  // ③ タグ列名は固定（タグID由来）
  const tagColName = `タグ_${TAG_ATTR_ID}`;

  // ④ 2行目の説明は「元シートB2」を優先（2枚目の "発送したよ" をそのまま使える）
const tagDesc = "発送したよ";

  // 出力（2行ヘッダ + データ）
  const output = [];
  output.push(["登録ID", tagColName]);
  output.push(["ID", tagDesc]);
  for (const id of uniq) {
    output.push([id, "1"]);
  }

  // 出力シートを一旦クリアしてから出す（ゴミ行が残らないように）
  dest.clearContents();
  dest.getRange(1, 1, output.length, 2).setValues(output);

  SpreadsheetApp.getUi().alert(`✅ タグCSVを作成しました（対象 ${uniq.length} 件）`);
}


/**
 * 既存download_dialog.htmlで Shift-JIS をダウンロード（3行目以降の2列）
 */
function downloadSJIS_TagCSV() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Lステタグ用CSV");
  if (!sheet) throw new Error("Lステタグ用CSV が見つかりません");

  const values = sheet.getDataRange().getValues(); // ★ 全行・全列そのまま

  if (values.length === 0) {
    SpreadsheetApp.getUi().alert("データがありません。");
    return;
  }

  const template = HtmlService.createTemplateFromFile("download_dialog");
  template.values = JSON.stringify(values);
  template.name = sheet.getName();

  SpreadsheetApp.getUi().showModalDialog(
    template.evaluate(),
    "CSV (Shift JIS) - タグ"
  );
}


/**
 * 作成→SJISダウンロードをワンボタン
 */
function generateAndDownload_TagCSV() {
  generateLstepTagCsvSheet();
  downloadSJIS_TagCSV();
}

/**************************************
 * ✅ ヤマトB2（データ交換規約）CSV生成（ヘッダーあり）
 * - アクティブな当日シート（例: 12/20）から作成
 * - B2側「ヘッダーあり」取り込み用
 * - 電話番号の先頭0欠落を補完（80/90/70/3）
 * - 住所を「町番地」と「アパマン」に自動分割して長さエラーを回避
 * - 通知メールは必ず利用（予定/完了）
 * - 請求先：090867281159 - 01 をCSVで固定（安定）
 **************************************/

const YAMATO_SENDER = {
  name: "のなめビューティー",
  postal: "1040061",
  address: "東京都中央区銀座７ー８ー８ー５Ｆ",
  // ご依頼主電話（印字用）
  phone: "09086728115",
  // ご依頼主電話枝番（印字用）
  phoneBranch: "01",
  // 完了通知の送信先
  email: "noname.beauty.online@gmail.com",
};

const YAMATO_FIXED = {
  invoiceType: "0",
  itemName1: "サプリメント（引火性・高圧ガスなし）",

  // ✅ B2契約に合わせる
  billingCustomerCode: "090867281159", // 40
  billingCategoryCode: "",             // 41（空欄）
  fareManagementNo: "01",              // 42（運賃管理番号）

  enableDeliveryForecastEmailByDefault: true,
  enableDeliveryCompletedEmailByDefault: false, // ← OFF
  deviceTypeForEmail: "1",

  forecastMessage:
    "のなめビューティーです。お荷物のお届け予定をお知らせします。",
  completedMessage:
    "のなめビューティーです。お荷物の配達完了をお知らせします。",
};


/** 当日シートA〜Pに合わせる（0-based） */
const IDX_BASE = {
  user_id: 0,           // A
  paid_at: 1,           // B 決済日時
  name: 2,              // C Name
  postal: 3,            // D Postal Code
  address: 4,           // E Address
  email: 5,             // F Email
  phone: 6,             // G Phone
  product_name: 7,      // H Product Name
  price: 8,             // I Price
  mg_2_5: 9,            // J
  mg_5: 10,             // K
  mg_7_5: 11,           // L
  mg_10: 12,            // M
  patient_id: 13,       // N
  payment_id: 14,       // O
  tracking_number: 15,  // P
};

function yamatoB2_makeCsvFromActiveSheet() {
  const sh = SpreadsheetApp.getActiveSheet();
  const sheetName = sh.getName();
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) throw new Error("データがありません（2行目以降が空）");

  // ヘッダー行から、任意列（Q以降）を名前で探す
  const headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || "").trim());
  const opt = makeHeaderIndex_(headerRow);

  const values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();

  // 出荷予定日（当日固定、YYYY/MM/DD）
  const shipDate = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd");

  // ✅ ヘッダー（B2取込で「ヘッダーあり」を選択する想定）
  const outHeader = [
    "お客様管理番号",                 // 1
    "送り状種類",                     // 2
    "クール区分",                     // 3
    "伝票番号",                       // 4
    "出荷予定日",                     // 5
    "お届け予定（指定）日",           // 6
    "配達時間帯",                     // 7
    "お届け先コード",                 // 8
    "お届け先電話番号",               // 9
    "お届け先電話番号枝番",           // 10
    "お届け先郵便番号",               // 11
    "お届け先住所",                   // 12（町番地）
    "お届け先住所（アパマン）",       // 13（建物・部屋）
    "お届け先会社部門1",              // 14
    "お届け先会社部門2",              // 15
    "お届け先名",                     // 16
    "お届け先名略称カナ",             // 17
    "敬称",                           // 18
    "ご依頼主コード",                 // 19
    "ご依頼主電話番号",               // 20
    "ご依頼主電話番号枝番",           // 21
    "ご依頼主郵便番号",               // 22
    "ご依頼主住所",                   // 23
    "ご依頼主住所（アパマン）",       // 24
    "ご依頼主名",                     // 25
    "ご依頼主略称カナ",               // 26
    "品名コード1",                    // 27
    "品名1",                          // 28
    "品名コード2",                    // 29
    "品名2",                          // 30
    "荷扱い1",                        // 31
    "荷扱い2",                        // 32
    "記事",                            // 33
    "コレクト代金引換額（税込）",     // 34
    "コレクト内消費税額等",           // 35
    "営業所止置き",                   // 36
    "営業所コード",                   // 37
    "発行枚数",                       // 38
    "個数口枠の印字",                 // 39
    "ご請求先顧客コード",             // 40
    "ご請求先分類コード",             // 41
    "運賃管理番号",                   // 42
    "クロネコwebコレクトデータ登録", // 43
    "webコレクト加盟店コード",        // 44
    "webコレクト申込受付番号1",       // 45
    "webコレクト申込受付番号2",       // 46
    "webコレクト申込受付番号3",       // 47
    "お届け予定eメール利用区分",      // 48
    "お届け予定eメールアドレス",      // 49
    "入力機種",                       // 50
    "お届け予定eメールメッセージ",    // 51
    "お届け完了eメール利用区分",      // 52
    "お届け完了eメールアドレス",      // 53
    "お届け完了eメールメッセージ",    // 54
    "クロネコ収納代行利用区分"        // 55
  ];

  const out = [outHeader];

  for (const r of values) {
    const name = String(r[IDX_BASE.name] ?? "").trim();
    const postal = normalizePostal_(String(r[IDX_BASE.postal] ?? ""));
    const addressFull = String(r[IDX_BASE.address] ?? "").trim();

    // ✅ 電話番号：先頭0補完
    const phone = normalizePhoneForYamato_(String(r[IDX_BASE.phone] ?? ""));

    const email = String(r[IDX_BASE.email] ?? "").trim();

    // 必須（最小）
    if (!name || !postal || !addressFull || !phone) continue;

    // ✅ 通知は必ず使う前提なので、Emailが空だと困る→ここで弾く
    if (!email) throw new Error(`Emailが空の行があります（通知必須のため中断）。氏名=${name}`);

    // ✅ 住所分割（町番地 / 建物部屋）
const sp = splitAddressForYamato_(addressFull);
const address1 = sp.addr1;
const address2 = sp.addr2;


    // --- 日時指定（任意列） ---
    const deliveryDate = opt.deliveryDate >= 0 ? String(r[opt.deliveryDate] ?? "").trim() : "";
    const timeBand = opt.timeBand >= 0 ? String(r[opt.timeBand] ?? "").trim() : "";

    // --- 営業所止め（任意列） ---
    const holdFlag = opt.holdFlag >= 0 ? String(r[opt.holdFlag] ?? "").trim() : "";
    const holdCode = opt.holdCode >= 0 ? String(r[opt.holdCode] ?? "").trim() : "";
    const isHold = (holdFlag === "1");
    if (isHold && !/^\d{6}$/.test(holdCode)) {
      throw new Error(`営業所止置き=1 なのに 営業所コードが6桁ではありません: ${holdCode}`);
    }

    // --- 通知メール（必ず利用） ---
    const forecastUseFlag = "1";
    const forecastEmail = email;
    const forecastMsg = YAMATO_FIXED.forecastMessage;

// 完了：OFF（不要）
const completedUseFlag = "0";
const completedEmail = "";
const completedMsg = "";

    const paymentId = String(r[IDX_BASE.payment_id] ?? "").trim();
    const userId = String(r[IDX_BASE.user_id] ?? "").trim();
    const patientId = String(r[IDX_BASE.patient_id] ?? "").trim();

    const cols = [];
    cols.push(paymentId || userId || "");   // 1
    cols.push(YAMATO_FIXED.invoiceType);    // 2
    cols.push("2");                         // 3
    cols.push("");                         // 4
    cols.push(shipDate);                   // 5
    cols.push(deliveryDate);               // 6
    cols.push(timeBand);                   // 7
    cols.push("");                         // 8
    cols.push(phone);                      // 9
    cols.push("");                         // 10
    cols.push(postal);                     // 11
    cols.push(address1);                   // 12
    cols.push(address2);                   // 13
    cols.push("");                         // 14
    cols.push("");                         // 15
    cols.push(name);                       // 16
    cols.push("");                         // 17
    cols.push("様");                       // 18
    cols.push("");                         // 19

    // ご依頼主TEL/枝番（印字用）
    cols.push(normalizePhoneForYamato_(YAMATO_SENDER.phone)); // 20
    cols.push(String(YAMATO_SENDER.phoneBranch || ""));       // 21

    cols.push(YAMATO_SENDER.postal);       // 22
    cols.push(YAMATO_SENDER.address);      // 23
    cols.push("");                         // 24
    cols.push(YAMATO_SENDER.name);         // 25
    cols.push("");                         // 26
    cols.push("");                         // 27
    cols.push(YAMATO_FIXED.itemName1);     // 28
    cols.push("");                         // 29
    cols.push("");                         // 30
    cols.push("");                         // 31
    cols.push("");                         // 32
cols.push(""); // 33 記事は空欄
    cols.push("");                         // 34
    cols.push("");                         // 35
    cols.push(isHold ? "1" : "0");         // 36
    cols.push(isHold ? holdCode : "");     // 37
    cols.push("1");                        // 38
    cols.push("1");                        // 39

    // ✅ 請求先固定（安定化）
    cols.push(YAMATO_FIXED.billingCustomerCode); // 40
    cols.push(YAMATO_FIXED.billingCategoryCode); // 41
    cols.push(YAMATO_FIXED.fareManagementNo);    // 42

    cols.push("0");                        // 43
    cols.push("");                         // 44
    cols.push("");                         // 45
    cols.push("");                         // 46
    cols.push("");                         // 47

    cols.push(forecastUseFlag);            // 48
    cols.push(forecastEmail);              // 49
    cols.push(YAMATO_FIXED.deviceTypeForEmail); // 50
    cols.push(forecastMsg);                // 51

    cols.push(completedUseFlag);           // 52
    cols.push(completedEmail);             // 53
    cols.push(completedMsg);               // 54

    cols.push("0");                        // 55

    out.push(cols);
  }

  if (out.length === 1) {
    throw new Error("有効な行がありません（Name/Postal/Address/Phoneが空、または全行スキップ）。");
  }

  const csv = toCsv_(out);
  const filename = `yamato_b2_${sheetName}_${shipDate.replaceAll("/", "")}.csv`;
  showDownloadDialog_(csv, filename);
}

/**
 * ✅ 電話番号の「先頭0欠落」を補完（80/90/70/3問題を吸収）
 */
function normalizePhoneForYamato_(s) {
  const raw = String(s || "").trim();
  if (!raw) return "";

  // 数字とハイフンのみ
  let t = raw.replace(/[^\d-]/g, "");

  // ハイフンあり先頭補完
  t = t.replace(/^80-/, "080-")
       .replace(/^90-/, "090-")
       .replace(/^70-/, "070-")
       .replace(/^3-/,  "03-");

  // ハイフンなし先頭補完
  if (/^\d+$/.test(t)) {
    if (/^80/.test(t)) t = "0" + t;
    else if (/^90/.test(t)) t = "0" + t;
    else if (/^70/.test(t)) t = "0" + t;
    else if (/^3/.test(t))  t = "0" + t;
  }

  return t;
}

// 郵便番号：数字のみ＋7桁に左ゼロ埋め（先頭0欠落対策）
function normalizePostal_(s) {
  let d = String(s || "").replace(/[^\d]/g, "");
  if (!d) return "";

  // 9桁などが来たら最後の7桁を採用（保険：9999999-9999 みたいなゴミ対策）
  if (d.length > 7) d = d.slice(-7);

  // 7桁未満なら左ゼロ埋め（0123456 が 123456 になっても復元）
  if (d.length < 7) d = d.padStart(7, "0");

  return d;
}


/**
 * ✅ 住所分割（町番地 / 建物部屋）
 */
/**
 * ✅ 住所分割（町番地 / 建物部屋）
 * 方針：
 * - 「丁目・番地・号・ハイフン連結（例: 1-17-1103）」は addr1 に残す（切らない）
 * - 末尾4〜5桁補正（1604→16-04など）はしない
 * - 建物名辞書は最小限（使うのは「明確に後段」と分かるトークンだけ）
 * - 基本は「番地ブロックの直後に続く“非数字”の塊」を addr2 に逃がす
 */
function splitAddressForYamato_(addressRaw) {
  const a = String(addressRaw || "").trim();
  if (!a) return { addr1: "", addr2: "" };

  // 1) 正規化：スペース統一・ハイフン統一（強すぎない）
  let s = a
    .replace(/　+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[‐-–—―ー−]/g, "-") // ハイフン類を "-" に寄せる
    .trim();

  // 2) 「都道府県 市区町村」まではB2が切る前提でも、
  //    addr1/addr2の文字数対策のため、ここでは全文を対象に分割する。

  // 3) 明確に「後段（建物・部屋・会社名）」になりやすいトークンがあれば、そこから addr2
  //    ※“建物名リスト”ではなく、構造トークンのみ（号室/階/棟/ビル等）
  const tokenRe = /(号室|室|階|Ｆ|F|棟|寮|ビル|マンション|アパート|ハイツ|メゾン|レジデンス|タワー|コーポ)/;
  const mt = s.match(tokenRe);
  if (mt && mt.index != null) {
    const idx = mt.index;
    const left = s.slice(0, idx).trim();
    const right = s.slice(idx).trim();

    // leftが空なら全部addr1へ（保険）
    if (!left) return { addr1: s, addr2: "" };

    // 例：「…1-17-1103プレサンス…」のように token なしで建物名が続くケースもあるため、
    // tokenが見つかった場合は素直に分割
    return { addr1: left, addr2: right };
  }

  // 4) 「番地ブロック」を探す
  //    例：
  //    - 河合3丁目1-10
  //    - 池尻3丁目19-5番地
  //    - 早稲田鶴巻町552ビューノ.k301
  //
  //    方針：番地ブロックは addr1 に残す（-1103 も含めてOK）
  //    その直後に「日本語/英字など非数字」が連結していたら、そこから addr2 へ逃がす

  // 番地ブロック候補（最初に出現する「数字開始」位置）
  // ※市区町村後の「1丁目」なども含むが、後段分割の目的には問題ない
  const firstNumIdx = s.search(/\d/);
  if (firstNumIdx < 0) {
    // 数字が無い住所：分割不能。全文をaddr1
    return { addr1: s, addr2: "" };
  }

  // 5) 数字列〜（丁目/番地/号/ハイフン連結数字）をできるだけ含む「番地ブロック末尾」を決める
  //    ここでは「数字・丁目・番地・号・ハイフン」の連続を最大限取る
  //    例：
  //      "空堀町1-17-1103プレサンス..." -> "空堀町1-17-1103" がブロック
  //      "城東区鴫野西3丁目1-27リバ..." -> "鴫野西3丁目1-27" がブロック
  const after = s.slice(firstNumIdx);

  // 数字ブロックを最大一致（丁目/番地/号/ハイフン/数字）
  const mBlock = after.match(/^(\d+(?:丁目)?(?:\d+)?(?:番地)?(?:\d+)?(?:号)?(?:-\d+)*(?:-\d+)*)/);
  // ↑この正規表現は「数字→(丁目)→数字→(番地)→数字→(号)→-数字…」を雑に許容して
  //   -1103 もブロック内に含める設計

  if (!mBlock) {
    // 念のため：数字があるのに取れないケースは全文addr1
    return { addr1: s, addr2: "" };
  }

  // 番地ブロックの開始は firstNumIdx、長さは mBlock[1].length
  const blockStart = firstNumIdx;
  const blockEnd = firstNumIdx + mBlock[1].length;
  const left = s.slice(0, blockEnd).trim();   // addr1候補（番地ブロックまで含む）
  const tail = s.slice(blockEnd).trim();      // 番地ブロック以降

  if (!tail) return { addr1: left, addr2: "" };

  // 6) tail が「明らかに建物名側」なら addr2
  //    - 先頭が文字（非数字）なら建物名の可能性が高い（例：プレサンス、ビューノ、株式会社）
  //    - 先頭が数字でも、あなたの方針では基本切らない（= addr1 に残す）なので addr2 にしない
  if (/^[^\d]/.test(tail)) {
    return { addr1: left, addr2: tail };
  }

  // 7) tail が数字で始まる場合：自動補正はしない方針なので、分割せず addr1 に寄せる
  //    例："...1-41-1-311" の "tail" が空でないケースは少ないが、保険で結合
  return { addr1: (left + tail).trim(), addr2: "" };
}


function makeHeaderIndex_(headerRow) {
  const idx = (name) => headerRow.indexOf(name);
  return {
    deliveryDate: idx("お届け指定日"),
    timeBand: idx("時間帯指定"),
    holdFlag: idx("営業所止置き"),
    holdCode: idx("営業所コード"),
    forecastUse: idx("お届け予定eメール利用"),
    completedUse: idx("お届け完了eメール利用"),
  };
}

/** CSV生成（RFC4180寄り） */
function toCsv_(rows) {
  // ✅ 全セルを常に "..." で囲んで文字列扱いを強制
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const v = cell === null || cell === undefined ? "" : String(cell);
          return `"${v.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\r\n");
}


function showDownloadDialog_(csvText, filename) {
  const html = HtmlService.createHtmlOutput(
    `<!doctype html><html><head><meta charset="utf-8"></head><body>
      <h3>ヤマトB2クラウド取込CSV（ヘッダーあり）</h3>
      <p>ファイル名：${escapeHtml_(filename)}</p>
      <a id="dl" href="#" download="${escapeHtml_(filename)}">▶ CSVをダウンロード</a>
      <script>
        const csv = ${JSON.stringify(csvText)};
        const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
        const url = URL.createObjectURL(blob);
        document.getElementById("dl").href = url;
      </script>
    </body></html>`
  ).setWidth(560).setHeight(230);

  SpreadsheetApp.getUi().showModalDialog(html, "CSVダウンロード");
}

function escapeHtml_(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeHeader_(s) {
  return String(s || "")
    .replace(/^\uFEFF/, "")   // BOM
    .replace(/　/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findCol_(headerRow, exactName) {
  const target = normalizeHeader_(exactName);
  for (let i = 0; i < headerRow.length; i++) {
    if (normalizeHeader_(headerRow[i]) === target) return i;
  }
  return -1;
}

function findColAny_(headerRow, candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const idx = findCol_(headerRow, candidates[i]);
    if (idx >= 0) return idx;
  }
  return -1;
}

function findColAnyNorm_(normalizedHeaderRow, candidates) {
  const cand = (candidates || []).map(normalizeHeader_);
  for (let i = 0; i < cand.length; i++) {
    const idx = normalizedHeaderRow.indexOf(cand[i]);
    if (idx >= 0) return idx;
  }
  return -1;
}


function applyTrackingFromJapanPostSheet() {
  applyTrackingToTodaySheetBySource_(JP_TRACKING_SHEET_NAME, "jp");
}

function applyTrackingFromYamatoSheet() {
  applyTrackingToTodaySheetBySource_(YAMATO_TRACKING_SHEET_NAME, "yamato");
}
function applyTrackingToTodaySheetBySource_(sourceSheetName, mode) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const todaySheet = ss.getActiveSheet(); // 当日発送シート
  const trackingSheet = ss.getSheetByName(sourceSheetName);

  if (!trackingSheet) {
    SpreadsheetApp.getUi().alert("追跡CSVシートが見つかりません: " + sourceSheetName);
    return;
  }

  const tLastRow = trackingSheet.getLastRow();
  const sLastRow = todaySheet.getLastRow();
  if (tLastRow < 2) {
    SpreadsheetApp.getUi().alert(sourceSheetName + " にデータがありません（ヘッダーの下に貼ってください）。");
    return;
  }
  if (sLastRow < 2) {
    SpreadsheetApp.getUi().alert("当日発送シートにデータがありません。");
    return;
  }

  // 当日発送シート：列
  const sHeader = todaySheet.getRange(1, 1, 1, todaySheet.getLastColumn()).getValues()[0].map(h => String(h || "").trim());
  const S_COL_TRACKING = findColAny_(sHeader, ["tracking_number", "追跡番号"]);
  if (S_COL_TRACKING < 0) {
    SpreadsheetApp.getUi().alert("当日発送シートに tracking_number（追跡番号）列が見つかりません。");
    return;
  }

  const sColCount = todaySheet.getLastColumn();
  const sRange = todaySheet.getRange(2, 1, sLastRow - 1, sColCount);
  const sValues = sRange.getValues();

  // 追跡CSV：列（ヘッダー）
  const tHeaderRaw = trackingSheet.getRange(1, 1, 1, trackingSheet.getLastColumn()).getValues()[0];
  const tHeaderNorm = tHeaderRaw.map(h => normalizeHeader_(h));

  const tValues = trackingSheet
    .getRange(2, 1, tLastRow - 1, trackingSheet.getLastColumn())
    .getValues();

  // map作成
  const map = {};
if (mode === "yamato") {
  const T_COL_PAYMENT = 0;   // ヤマト追跡CSV：お客様管理番号(A)
  const T_COL_TRACKING = 3;  // ヤマト追跡CSV：伝票番号(D)

  const S_COL_PAYMENT = 14;  // 当日発送：payment_id(O) 0-based
  const S_COL_TRACKING = 15; // 当日発送：tracking_number(P) 0-based

  const mp = new Map();
  for (const row of tValues) {
    const pay = normalizeKey_(row[T_COL_PAYMENT]);
    const trk = String(row[T_COL_TRACKING] || "").trim();
    if (!pay || !trk) continue;
    mp.set(pay, trk);
  }

  let updated = 0, skipped = 0, notFound = 0;

  for (let i = 0; i < sValues.length; i++) {
    const row = sValues[i];

    const existing = String(row[S_COL_TRACKING] || "").trim();
    if (existing) { skipped++; continue; }

    const pay = normalizeKey_(row[S_COL_PAYMENT]);
    if (!pay) continue;

    const trk = mp.get(pay);
    if (!trk) { notFound++; continue; }

    row[S_COL_TRACKING] = trk;
    updated++;
  }

  if (updated > 0) sRange.setValues(sValues);

  SpreadsheetApp.getUi().alert(
    `【ヤマト】更新 ${updated} / 既に追跡あり ${skipped} / 不一致 ${notFound}`
  );
  return;
}


  // 日本郵便：氏名+メール
  const T_COL_TRACKING = findColAnyNorm_(tHeaderNorm, ["追跡番号"]);
  const T_COL_NAME     = findColAnyNorm_(tHeaderNorm, ["お届け先／お名前"]);
  const T_COL_EMAIL    = findColAnyNorm_(tHeaderNorm, ["お届け先／電子メールアドレス"]);

  if (T_COL_TRACKING < 0 || T_COL_NAME < 0 || T_COL_EMAIL < 0) {
    SpreadsheetApp.getUi().alert(
      "日本郵便追跡CSVの必要列が見つかりません。\n必要：追跡番号 / お届け先／お名前 / お届け先／電子メールアドレス"
    );
    return;
  }

  const S_COL_NAME  = findColAny_(sHeader, ["Name", "氏名"]);
  const S_COL_EMAIL = findColAny_(sHeader, ["Email", "メール", "電子メールアドレス"]);
  if (S_COL_NAME < 0 || S_COL_EMAIL < 0) {
    SpreadsheetApp.getUi().alert("当日発送シートに Name / Email 列が見つかりません（日本郵便突合に必須）。");
    return;
  }

  for (const row of tValues) {
    const tracking = String(row[T_COL_TRACKING] || "").trim();
    if (!tracking) continue;

    const name  = normalizeName_(row[T_COL_NAME]);
    const email = normalizeEmail_(row[T_COL_EMAIL]);
    if (!name || !email) continue;

    map[name + "|" + email] = tracking;
  }

  let updated = 0, notFound = 0, skippedAlready = 0;
  for (let i = 0; i < sValues.length; i++) {
    const row = sValues[i];

    const existing = String(row[S_COL_TRACKING] || "").trim();
    if (existing) { skippedAlready++; continue; }

    const name  = normalizeName_(row[S_COL_NAME]);
    const email = normalizeEmail_(row[S_COL_EMAIL]);
    if (!name || !email) continue;

    const tracking = map[name + "|" + email];
    if (!tracking) { notFound++; continue; }

    row[S_COL_TRACKING] = tracking;
    updated++;
  }

  if (updated > 0) sRange.setValues(sValues);

  SpreadsheetApp.getUi().alert(
    `【日本郵便】追跡番号を ${updated} 件付与しました。\n既に追跡ありスキップ ${skippedAlready} 件\n未一致 ${notFound} 件`
  );
}

function debugYamatoMatch() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const today = ss.getActiveSheet(); // 12/24 をアクティブにして実行
  const y = ss.getSheetByName("ヤマト追跡CSV");
  if (!y) throw new Error("ヤマト追跡CSV が見つかりません");

  const sHeader = today.getRange(1, 1, 1, today.getLastColumn()).getValues()[0].map(h => String(h || ""));
  const sHeaderTrim = sHeader.map(h => h.trim());
  const S_COL_PAYMENT = sHeaderTrim.indexOf("payment_id");
  const S_COL_TRACK = sHeaderTrim.indexOf("tracking_number");

  Logger.log("today sheet name=" + today.getName());
  Logger.log("today payment_id col (0-based)=" + S_COL_PAYMENT + " / tracking_number col=" + S_COL_TRACK);
  Logger.log("today header sample=" + JSON.stringify(sHeaderTrim.slice(Math.max(0, S_COL_PAYMENT-3), S_COL_PAYMENT+4)));

  // 今日シートの payment_id を先頭3件
  const sVals = today.getRange(2, S_COL_PAYMENT + 1, 3, 1).getValues().flat().map(v => String(v || ""));
  Logger.log("today payment_id first3=" + JSON.stringify(sVals));

  const tHeader = y.getRange(1, 1, 1, y.getLastColumn()).getValues()[0].map(h => String(h || ""));
  const tHeaderTrim = tHeader.map(h => h.trim().replace(/^\uFEFF/, ""));
  const T_COL_PAYMENT = tHeaderTrim.indexOf("お客様管理番号");
  const T_COL_TRACK = tHeaderTrim.indexOf("伝票番号");

  Logger.log("yamato payment col (0-based)=" + T_COL_PAYMENT + " / track col=" + T_COL_TRACK);
  Logger.log("yamato header sample=" + JSON.stringify(tHeaderTrim.slice(Math.max(0, T_COL_PAYMENT-3), T_COL_PAYMENT+4)));

  const tVals = y.getRange(2, T_COL_PAYMENT + 1, 3, 1).getValues().flat().map(v => String(v || ""));
  Logger.log("yamato お客様管理番号 first3=" + JSON.stringify(tVals));

  // 1件だけ突合してみる
  const key0 = sVals[0].trim();
  Logger.log("key0=" + key0);
  const found = y.getRange(2, 1, y.getLastRow()-1, y.getLastColumn()).getValues().some(r => String(r[T_COL_PAYMENT]||"").trim() === key0);
  Logger.log("exists in yamato sheet? " + found);
}

function normalizeKey_(v) {
  return String(v || "")
    .normalize("NFKC")
    .replace(/^\uFEFF/, "")           // BOM
    .replace(/[\u0000-\u001F]/g, "")  // 制御文字
    .replace(/[ 　\t\r\n]/g, "")      // 半角/全角スペース、タブ、改行
    .trim();
}

const MYPAGE_INVALIDATE_URL =
  "https://script.google.com/macros/s/AKfycbxWrQPowxYyCkUDRNNqik--L-zzfRGzdhbqTaFqP9tFWzJIUWy0UGK8fiV0owGVw0Q4/exec";

function invalidateMypageCache_() {
  const props = PropertiesService.getScriptProperties();
  const secret = String(props.getProperty("MYPAGE_INVALIDATE_SECRET") || "").trim(); // ★発送側にも同じSECRETを入れる

  try {
    UrlFetchApp.fetch(MYPAGE_INVALIDATE_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        type: "invalidate_cache",
        secret: secret,
      }),
      muteHttpExceptions: true,
    });
  } catch (e) {
    // 失敗しても発送処理自体は止めない
  }
}
function testInvalidateMypageCache() {
  invalidateMypageCache_();
  Logger.log("sent");
}

// =====================
// shipping_index（問診ブック）へ upsert
// =====================
function upsertShippingIndexToIntakeBook_(paymentId, trackingNumber, shippingStatus, shippingDate, carrier) {
  const pay = String(paymentId || "").trim();
  if (!pay) return;

  const props = PropertiesService.getScriptProperties();

  // ★問診ブックIDを Script Properties に入れておくのがおすすめ
  //   key例: INTAKE_BOOK_ID
  // すでに SPREADSHEET_ID を使っているGASならそれでもOK
  const intakeBookId =
    props.getProperty("INTAKE_BOOK_ID") ||
    props.getProperty("SPREADSHEET_ID") || // 既に同名キーがある場合の保険
    "";

  if (!intakeBookId) {
    // 最低限、ここで分かるようにログ
    Logger.log("[upsertShippingIndexToIntakeBook_] missing INTAKE_BOOK_ID");
    return;
  }

  const ss = SpreadsheetApp.openById(intakeBookId);
  let sh = ss.getSheetByName("shipping_index");
  if (!sh) {
    sh = ss.insertSheet("shipping_index");
  }

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

  // shipping_date 整形
  let shipDateStr = "";
  if (shippingDate instanceof Date) {
    shipDateStr = Utilities.formatDate(shippingDate, "Asia/Tokyo", "yyyy-MM-dd");
  } else {
    shipDateStr = String(shippingDate || "").trim();
  }

  const tn = String(trackingNumber || "").trim();
  const st = String(shippingStatus || "").trim();
  const car = String(carrier || "").trim();
  const nowStr = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");

  // 既存行検索（payment_id）
  const lastRow = sh.getLastRow();
  let hitRow = 0;

  if (lastRow >= 2) {
    const rng = sh.getRange(2, cPay, lastRow - 1, 1);
    const cell = rng.createTextFinder(pay).matchEntireCell(true).findNext();
    if (cell) hitRow = cell.getRow();
  }

  if (!hitRow) {
    // 新規追加
    const row = new Array(lastCol).fill("");
    row[cPay - 1] = pay;
    row[cTn - 1]  = tn;
    row[cSt - 1]  = st;
    row[cDt - 1]  = shipDateStr;
    row[cCar - 1] = car;
    row[cUp - 1]  = nowStr;
    sh.appendRow(row);
    return;
  }

  // 既存更新（空は上書きしない）
  if (tn) sh.getRange(hitRow, cTn).setValue(tn);
  if (st) sh.getRange(hitRow, cSt).setValue(st);
  if (shipDateStr) sh.getRange(hitRow, cDt).setValue(shipDateStr);
  if (car) sh.getRange(hitRow, cCar).setValue(car);
  sh.getRange(hitRow, cUp).setValue(nowStr);
}
