// lib/hotpepper-csv-parser.ts — SALON BOARD予約CSVパーサー

/** SALON BOARDからエクスポートされた予約1行分 */
export interface HotpepperReservation {
  reserveDate: string;      // YYYY-MM-DD
  startTime: string;        // HH:mm
  endTime: string;          // HH:mm
  customerName: string;
  phone: string;
  menuName: string;
  staffName: string;
  amount: number;
  status: string;           // 来店済/キャンセル/予約中
  notes: string;
}

/**
 * CSV行をダブルクォート対応でフィールド分割する
 * RFC 4180準拠: フィールド内のカンマ・改行・ダブルクォートに対応
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        // 次の文字もダブルクォートならエスケープ
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * 日付文字列をYYYY-MM-DD形式に正規化
 * 対応形式: yyyy/MM/dd, yyyy-MM-dd
 */
function normalizeDate(raw: string): string {
  const trimmed = raw.trim();
  // yyyy/MM/dd → yyyy-MM-dd
  const slashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const [, y, m, d] = slashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // yyyy-MM-dd そのまま
  const dashMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashMatch) {
    const [, y, m, d] = dashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return trimmed;
}

/**
 * 時刻文字列をHH:mm形式に正規化
 * 対応: H:mm, HH:mm
 */
function normalizeTime(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const [, h, m] = match;
    return `${h.padStart(2, "0")}:${m}`;
  }
  return trimmed;
}

/**
 * 金額文字列をnumberに変換
 * カンマ・円記号・¥除去
 */
function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[,，円¥￥\s]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * SALON BOARD予約CSVをパースする
 *
 * 想定カラム順:
 * 予約日, 開始時刻, 終了時刻, お客様名, 電話番号, メニュー名, スタッフ名, 金額, ステータス, 備考
 */
export function parseHotpepperCsv(csvText: string): HotpepperReservation[] {
  // BOM除去
  let text = csvText;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const lines = text.split(/\r?\n/);
  const results: HotpepperReservation[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = splitCsvLine(line);
    // 最低限、予約日・開始時刻・お客様名が必要（10カラム想定だが柔軟に）
    if (fields.length < 4) continue;

    results.push({
      reserveDate: normalizeDate(fields[0] || ""),
      startTime: normalizeTime(fields[1] || ""),
      endTime: normalizeTime(fields[2] || ""),
      customerName: fields[3] || "",
      phone: (fields[4] || "").replace(/[-\s]/g, ""),
      menuName: fields[5] || "",
      staffName: fields[6] || "",
      amount: parseAmount(fields[7] || "0"),
      status: fields[8] || "",
      notes: fields[9] || "",
    });
  }

  return results;
}
