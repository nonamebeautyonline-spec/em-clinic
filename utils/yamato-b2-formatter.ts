/**
 * ヤマトB2 CSVフォーマッター
 * GASのロジックをTypeScriptに移植
 * ※設定は管理画面から変更可能（lib/shipping/config.ts参照）
 */

export interface YamatoB2Config {
  senderName: string;
  senderPostal: string;
  senderAddress: string;
  senderPhone: string;
  senderPhoneBranch: string;
  senderEmail: string;
  billingCustomerCode: string;
  billingCategoryCode: string;
  fareManagementNo: string;
  itemName: string;
  coolType?: string;
  forecastMessage: string;
  completedMessage: string;
}

/** デフォルト設定（DB未設定時のフォールバック） */
export const YAMATO_B2_CONFIG: YamatoB2Config = {
  senderName: "のなめビューティー",
  senderPostal: "1040061",
  senderAddress: "東京都中央区銀座７ー８ー８ー５Ｆ",
  senderPhone: "09086728115",
  senderPhoneBranch: "01",
  senderEmail: "noname.beauty.online@gmail.com",
  billingCustomerCode: "090867281159",
  billingCategoryCode: "",
  fareManagementNo: "01",
  itemName: "サプリメント（引火性・高圧ガスなし）",
  coolType: "2",
  forecastMessage: "のなめビューティーです。お荷物のお届け予定をお知らせします。",
  completedMessage: "のなめビューティーです。お荷物の配達完了をお知らせします。",
};

/**
 * 電話番号の先頭0欠落を補完（80/90/70/3問題を吸収）
 */
export function normalizePhoneForYamato(raw: string): string {
  if (!raw) return "";

  // 数字とハイフンのみ
  let t = raw.replace(/[^\d-]/g, "");

  // ハイフンあり先頭補完
  t = t
    .replace(/^80-/, "080-")
    .replace(/^90-/, "090-")
    .replace(/^70-/, "070-")
    .replace(/^3-/, "03-");

  // ハイフンなし先頭補完
  if (/^\d+$/.test(t)) {
    if (/^80/.test(t)) t = "0" + t;
    else if (/^90/.test(t)) t = "0" + t;
    else if (/^70/.test(t)) t = "0" + t;
    else if (/^3/.test(t)) t = "0" + t;
  }

  return t;
}

/**
 * 郵便番号：数字のみ＋7桁に左ゼロ埋め（先頭0欠落対策）
 */
export function normalizePostal(s: string): string {
  let d = s.replace(/[^\d]/g, "");
  if (!d) return "";

  // 9桁などが来たら最後の7桁を採用
  if (d.length > 7) d = d.slice(-7);

  // 7桁未満なら左ゼロ埋め
  if (d.length < 7) d = d.padStart(7, "0");

  return d;
}

/**
 * 住所分割（町番地 / 建物部屋）
 */
export function splitAddressForYamato(addressRaw: string): { addr1: string; addr2: string } {
  const a = addressRaw.trim();
  if (!a) return { addr1: "", addr2: "" };

  // 1) 正規化：スペース統一・ハイフン統一
  let s = a
    .replace(/　+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[‐-–—―ー−]/g, "-")
    .trim();

  // 2) 明確に「後段（建物・部屋・会社名）」になりやすいトークンがあれば、そこから addr2
  const tokenRe = /(号室|室|階|Ｆ|F|棟|寮|ビル|マンション|アパート|ハイツ|メゾン|レジデンス|タワー|コーポ)/;
  const mt = s.match(tokenRe);
  if (mt && mt.index != null) {
    const idx = mt.index;
    const left = s.slice(0, idx).trim();
    const right = s.slice(idx).trim();

    if (!left) return { addr1: s, addr2: "" };
    return { addr1: left, addr2: right };
  }

  // 3) 「番地ブロック」を探す
  const firstNumIdx = s.search(/\d/);
  if (firstNumIdx < 0) {
    return { addr1: s, addr2: "" };
  }

  // 4) 数字列〜（丁目/番地/号/ハイフン連結数字）をできるだけ含む「番地ブロック末尾」を決める
  const after = s.slice(firstNumIdx);
  const mBlock = after.match(/^(\d+(?:丁目)?(?:\d+)?(?:番地)?(?:\d+)?(?:号)?(?:-\d+)*(?:-\d+)*)/);

  if (!mBlock) {
    return { addr1: s, addr2: "" };
  }

  const blockEnd = firstNumIdx + mBlock[1].length;
  const left = s.slice(0, blockEnd).trim();
  const tail = s.slice(blockEnd).trim();

  if (!tail) return { addr1: left, addr2: "" };

  // 5) tail が「明らかに建物名側」なら addr2
  if (/^[^\d]/.test(tail)) {
    return { addr1: left, addr2: tail };
  }

  // 6) tail が数字で始まる場合：分割せず addr1 に寄せる
  return { addr1: (left + tail).trim(), addr2: "" };
}

/**
 * ヤマトB2用のCSV行データを生成（55列）
 */
interface OrderData {
  payment_id: string;
  name: string;
  postal: string;
  address: string;
  email: string;
  phone: string;
}

export function generateYamatoB2Row(order: OrderData, shipDate: string, config?: YamatoB2Config): string[] {
  const cfg = config || YAMATO_B2_CONFIG;
  const name = order.name.trim();
  const postal = normalizePostal(order.postal);
  const addressFull = order.address.trim();
  const phone = normalizePhoneForYamato(order.phone);
  const email = order.email.trim();

  // 住所分割
  const { addr1, addr2 } = splitAddressForYamato(addressFull);

  // 沖縄判定：住所に「沖縄」が含まれている場合は品名を変更
  const isOkinawa = addressFull.includes("沖縄");
  const itemName = isOkinawa
    ? "医薬品・注射器（未使用、引火性・高圧ガスなし）"
    : cfg.itemName;

  const cols: string[] = [];
  cols.push(order.payment_id || ""); // 1: お客様管理番号
  cols.push("0"); // 2: 送り状種類
  cols.push(cfg.coolType || "2"); // 3: クール区分（0=常温, 1=冷蔵, 2=冷凍）
  cols.push(""); // 4: 伝票番号
  cols.push(shipDate); // 5: 出荷予定日
  cols.push(""); // 6: お届け予定（指定）日
  cols.push(""); // 7: 配達時間帯
  cols.push(""); // 8: お届け先コード
  cols.push(phone); // 9: お届け先電話番号
  cols.push(""); // 10: お届け先電話番号枝番
  cols.push(postal); // 11: お届け先郵便番号
  cols.push(addr1); // 12: お届け先住所（町番地）
  cols.push(addr2); // 13: お届け先住所（アパマン）
  cols.push(""); // 14: お届け先会社部門1
  cols.push(""); // 15: お届け先会社部門2
  cols.push(name); // 16: お届け先名
  cols.push(""); // 17: お届け先名略称カナ
  cols.push("様"); // 18: 敬称
  cols.push(""); // 19: ご依頼主コード
  cols.push(normalizePhoneForYamato(cfg.senderPhone)); // 20: ご依頼主電話番号
  cols.push(cfg.senderPhoneBranch); // 21: ご依頼主電話番号枝番
  cols.push(cfg.senderPostal); // 22: ご依頼主郵便番号
  cols.push(cfg.senderAddress); // 23: ご依頼主住所
  cols.push(""); // 24: ご依頼主住所（アパマン）
  cols.push(cfg.senderName); // 25: ご依頼主名
  cols.push(""); // 26: ご依頼主略称カナ
  cols.push(""); // 27: 品名コード1
  cols.push(itemName); // 28: 品名1（沖縄判定により変更）
  cols.push(""); // 29: 品名コード2
  cols.push(""); // 30: 品名2
  cols.push(""); // 31: 荷扱い1
  cols.push(""); // 32: 荷扱い2
  cols.push(""); // 33: 記事
  cols.push(""); // 34: コレクト代金引換額（税込）
  cols.push(""); // 35: コレクト内消費税額等
  cols.push("0"); // 36: 営業所止置き
  cols.push(""); // 37: 営業所コード
  cols.push("1"); // 38: 発行枚数
  cols.push("1"); // 39: 個数口枠の印字
  cols.push(cfg.billingCustomerCode); // 40: ご請求先顧客コード
  cols.push(cfg.billingCategoryCode); // 41: ご請求先分類コード
  cols.push(cfg.fareManagementNo); // 42: 運賃管理番号
  cols.push("0"); // 43: クロネコwebコレクトデータ登録
  cols.push(""); // 44: webコレクト加盟店コード
  cols.push(""); // 45: webコレクト申込受付番号1
  cols.push(""); // 46: webコレクト申込受付番号2
  cols.push(""); // 47: webコレクト申込受付番号3
  cols.push("1"); // 48: お届け予定eメール利用区分
  cols.push(email); // 49: お届け予定eメールアドレス
  cols.push("1"); // 50: 入力機種
  cols.push(cfg.forecastMessage); // 51: お届け予定eメールメッセージ
  cols.push("0"); // 52: お届け完了eメール利用区分
  cols.push(""); // 53: お届け完了eメールアドレス
  cols.push(""); // 54: お届け完了eメールメッセージ
  cols.push("0"); // 55: クロネコ収納代行利用区分

  return cols;
}

/**
 * ヤマトB2 CSVヘッダー（55列）
 */
export const YAMATO_B2_HEADER = [
  "お客様管理番号", // 1
  "送り状種類", // 2
  "クール区分", // 3
  "伝票番号", // 4
  "出荷予定日", // 5
  "お届け予定（指定）日", // 6
  "配達時間帯", // 7
  "お届け先コード", // 8
  "お届け先電話番号", // 9
  "お届け先電話番号枝番", // 10
  "お届け先郵便番号", // 11
  "お届け先住所", // 12
  "お届け先住所（アパマン）", // 13
  "お届け先会社部門1", // 14
  "お届け先会社部門2", // 15
  "お届け先名", // 16
  "お届け先名略称カナ", // 17
  "敬称", // 18
  "ご依頼主コード", // 19
  "ご依頼主電話番号", // 20
  "ご依頼主電話番号枝番", // 21
  "ご依頼主郵便番号", // 22
  "ご依頼主住所", // 23
  "ご依頼主住所（アパマン）", // 24
  "ご依頼主名", // 25
  "ご依頼主略称カナ", // 26
  "品名コード1", // 27
  "品名1", // 28
  "品名コード2", // 29
  "品名2", // 30
  "荷扱い1", // 31
  "荷扱い2", // 32
  "記事", // 33
  "コレクト代金引換額（税込）", // 34
  "コレクト内消費税額等", // 35
  "営業所止置き", // 36
  "営業所コード", // 37
  "発行枚数", // 38
  "個数口枠の印字", // 39
  "ご請求先顧客コード", // 40
  "ご請求先分類コード", // 41
  "運賃管理番号", // 42
  "クロネコwebコレクトデータ登録", // 43
  "webコレクト加盟店コード", // 44
  "webコレクト申込受付番号1", // 45
  "webコレクト申込受付番号2", // 46
  "webコレクト申込受付番号3", // 47
  "お届け予定eメール利用区分", // 48
  "お届け予定eメールアドレス", // 49
  "入力機種", // 50
  "お届け予定eメールメッセージ", // 51
  "お届け完了eメール利用区分", // 52
  "お届け完了eメールアドレス", // 53
  "お届け完了eメールメッセージ", // 54
  "クロネコ収納代行利用区分", // 55
];

/**
 * CSV行をエスケープしてフォーマット
 */
export function toCsvRow(cols: string[]): string {
  return cols
    .map((cell) => {
      const v = cell === null || cell === undefined ? "" : String(cell);
      return `"${v.replace(/"/g, '""')}"`;
    })
    .join(",");
}

/**
 * CSVデータを生成
 */
export function generateYamatoB2Csv(orders: OrderData[], shipDate: string, config?: YamatoB2Config): string {
  const rows: string[] = [];
  rows.push(toCsvRow(YAMATO_B2_HEADER));

  for (const order of orders) {
    const row = generateYamatoB2Row(order, shipDate, config);
    rows.push(toCsvRow(row));
  }

  return rows.join("\r\n");
}
