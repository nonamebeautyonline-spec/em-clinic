// lib/square-csv-parser.ts — Squareの商品リストCSVをパースして商品データに変換
//
// Square商品エクスポートCSV（日本語版）のカラムマッピング:
//   商品名 → title | SKU → code | 価格 → price | カテゴリ → category | 説明 → description

export type ParsedProduct = {
  rowIndex: number; // 元CSV行番号（エラー表示用、1始まり）
  title: string;
  code: string;
  price: number;
  category: string;
  description: string;
};

export type ParseError = {
  row: number; // 1始まり行番号
  message: string;
};

export type ParseResult = {
  products: ParsedProduct[];
  errors: ParseError[];
  totalRows: number;
  headerDetected: boolean;
};

// Squareの日本語CSVヘッダー → 内部フィールド
const COLUMN_MAP: Record<string, keyof ParsedProduct> = {
  "商品名": "title",
  "バリエーション名": "title", // バリエーション名はtitleに付加
  "SKU": "code",
  "価格": "price",
  "カテゴリ": "category",
  "説明": "description",
};

// 英語ヘッダーにも対応（Square英語版エクスポート）
const COLUMN_MAP_EN: Record<string, keyof ParsedProduct> = {
  "Item Name": "title",
  "Variation Name": "title",
  "SKU": "code",
  "Price": "price",
  "Category": "category",
  "Description": "description",
};

/**
 * CSVテキストを行×フィールドにパース（引用符・改行対応）
 */
function parseCsvText(text: string): string[][] {
  const records: string[][] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(field.trim());
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n") i++;
        fields.push(field.trim());
        if (fields.some((f) => f !== "")) records.push(fields);
        fields = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  // 末尾
  if (field || fields.length > 0) {
    fields.push(field.trim());
    if (fields.some((f) => f !== "")) records.push(fields);
  }
  return records;
}

/**
 * 価格文字列をパース（¥・カンマ・JPY除去）
 */
function parsePrice(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[￥¥,、\s円JPY]/gi, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
}

/**
 * ヘッダー行を解析してカラムインデックスマップを構築
 */
function detectColumns(header: string[]): {
  mapping: Map<string, number>;
  variationNameIdx: number;
  detected: boolean;
} {
  const mapping = new Map<string, number>();
  let variationNameIdx = -1;
  const allMaps = { ...COLUMN_MAP, ...COLUMN_MAP_EN };

  for (let i = 0; i < header.length; i++) {
    const h = header[i].trim();
    if (h === "バリエーション名" || h === "Variation Name") {
      variationNameIdx = i;
      continue; // バリエーション名は別処理
    }
    if (allMaps[h]) {
      mapping.set(allMaps[h], i);
    }
  }

  // 最低限 title と price が検出されていれば有効
  const detected = mapping.has("title") && mapping.has("price");
  return { mapping, variationNameIdx, detected };
}

/**
 * SquareのCSVテキストをパースして商品データに変換
 */
export function parseSquareCsv(text: string): ParseResult {
  // BOM除去
  const cleanText = text.replace(/^\uFEFF/, "");

  const rows = parseCsvText(cleanText);
  if (rows.length < 2) {
    return { products: [], errors: [{ row: 1, message: "CSVが空またはヘッダーのみです" }], totalRows: 0, headerDetected: false };
  }

  const header = rows[0];
  const { mapping, variationNameIdx, detected } = detectColumns(header);

  if (!detected) {
    return {
      products: [],
      errors: [{ row: 1, message: "Squareの商品リストCSVのヘッダーを検出できません。「商品名」「価格」カラムが必要です" }],
      totalRows: rows.length - 1,
      headerDetected: false,
    };
  }

  const products: ParsedProduct[] = [];
  const errors: ParseError[] = [];
  const seenCodes = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const fields = rows[i];
    const rowNum = i + 1; // 1始まり（ヘッダー=1行目）

    // カラム取得ヘルパー
    const get = (field: string): string => {
      const idx = mapping.get(field);
      return idx !== undefined && idx < fields.length ? fields[idx] : "";
    };

    let title = get("title");
    const variationName = variationNameIdx >= 0 && variationNameIdx < fields.length
      ? fields[variationNameIdx].trim()
      : "";

    // バリエーション名をtitleに付加
    if (variationName && variationName !== title) {
      title = title ? `${title} (${variationName})` : variationName;
    }

    const code = get("code");
    const priceRaw = get("price");
    const category = get("category");
    const description = get("description");

    // バリデーション
    if (!title) {
      errors.push({ row: rowNum, message: "商品名が空です" });
      continue;
    }

    const price = parsePrice(priceRaw);
    if (price === null || price < 0) {
      errors.push({ row: rowNum, message: `価格が不正です: "${priceRaw}"` });
      continue;
    }

    // codeが空の場合はtitleベースで自動生成
    const finalCode = code || generateCode(title);

    // CSV内での重複チェック
    if (seenCodes.has(finalCode)) {
      errors.push({ row: rowNum, message: `商品コード「${finalCode}」がCSV内で重複しています` });
      continue;
    }
    seenCodes.add(finalCode);

    products.push({
      rowIndex: rowNum,
      title,
      code: finalCode,
      price,
      category,
      description,
    });
  }

  return {
    products,
    errors,
    totalRows: rows.length - 1,
    headerDetected: true,
  };
}

/**
 * 商品名からコードを自動生成（SKUが空の場合のフォールバック）
 */
function generateCode(title: string): string {
  // 英数字・ハイフン・アンダースコアのみ残す → 大文字化
  const ascii = title
    .replace(/[（(]/g, "_")
    .replace(/[）)]/g, "")
    .replace(/[\s　]+/g, "_")
    .replace(/[^a-zA-Z0-9_\-\u3000-\u9FFF]/g, "")
    .slice(0, 30);
  return ascii || `ITEM_${Date.now()}`;
}
