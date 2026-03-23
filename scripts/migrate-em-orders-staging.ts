// scripts/migrate-em-orders-staging.ts
// EMオンラインクリニック: 決済CSVをem_order_stagingテーブルに仮投入
//
// 使い方:
//   npx tsx scripts/migrate-em-orders-staging.ts --file "./data/マスター - 2024年全データ.csv" --year 2024 --tenant-id <UUID>
//   npx tsx scripts/migrate-em-orders-staging.ts --file "./data/マスター - 2025年全データ .csv" --year 2025 --tenant-id <UUID>
//   npx tsx scripts/migrate-em-orders-staging.ts --file "./data/マスター - 2026年全データ.csv" --year 2026 --tenant-id <UUID>
//   末尾に --exec を付けると本番実行
//
// CSV形式（カンマ区切り、ダブルクォート囲みあり）:
//   2024年: Order Date(0), Name(1), Postal Code(2), Address(3), Email(4), Phone(5), Product Name(6), ..., Product Price(30)
//   2025/2026年: f(0), Name(1), Postal Code(2), Address(3), Email(4), Phone(5), Product Name(6), Price(7), ...
//
// 金額形式: "28000" or "￥28,000" or "￥25,500"（¥記号とカンマを除去して数値化）

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// .env.local読み込み
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("環境変数不足: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// 引数パース
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
const csvFile = getArg("file");
const tenantId = getArg("tenant-id");
const csvYear = getArg("year");
const isExec = args.includes("--exec");

if (!csvFile || !tenantId) {
  console.error("使い方: npx tsx scripts/migrate-em-orders-staging.ts --file <CSV> --tenant-id <UUID> --year <YYYY> [--exec]");
  process.exit(1);
}

// normalizeJPPhone
function normalizeJPPhone(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  let digits = s.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0080")) digits = "080" + digits.slice(4);
  else if (digits.startsWith("0090")) digits = "090" + digits.slice(4);
  else if (digits.startsWith("0070")) digits = "070" + digits.slice(4);
  else if (digits.startsWith("00")) digits = digits.slice(1);
  if (digits.startsWith("81") && digits.length >= 11) {
    digits = digits.slice(2);
    if (!digits.startsWith("0")) digits = "0" + digits;
  }
  if (!digits.startsWith("0") && /^[789]/.test(digits)) digits = "0" + digits;
  return digits;
}

// cleanEmName
function cleanEmName(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  let s = trimmed.replace(
    /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2B50}\u{2705}\u{274C}\u{2B55}\u{26AA}\u{26AB}\u{25CF}\u{25CB}\u{25A0}\u{25A1}\u{2764}\u{2716}\u{2714}\u{23F0}-\u{23FA}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25FE}\u{25FD}\u{25FC}\u{25FB}\u{2B1B}\u{2B1C}\u{3030}\u{303D}\u{FE0E}]+/u,
    "",
  ).trim();
  const prefixes = [
    "郵便局", "診断書", "要確認", "確認済", "確認済み",
    "発送済", "発送済み", "返品", "保留", "キャンセル",
    "再発送", "転送", "書留", "速達", "レターパック",
    "ゆうパック", "宅急便", "クリックポスト", "ネコポス",
  ];
  for (const prefix of prefixes) {
    if (s.startsWith(prefix)) {
      s = s.slice(prefix.length).trim();
      break;
    }
  }
  const parts = s.split(/[\s　]+/).filter(Boolean);
  if (parts.length >= 2 && prefixes.some((p) => parts[0].includes(p))) {
    s = parts.slice(1).join("");
  } else if (parts.length >= 2) {
    s = parts.join("");
  }
  return s || trimmed;
}

// ダブルクォート対応CSVパーサー
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
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

// 金額パース: "28000" or "￥28,000" → 28000
function parseAmount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[￥¥,、\s]/g, "");
  return parseInt(cleaned, 10) || 0;
}

// 日時パース: "2024/9/11" or "2025/01/01 0:08:35" → ISO 8601 (JST)
function parseJstDateTime(raw: string): string | null {
  if (!raw) return null;
  // 日時あり: "2025/01/01 0:08:35"
  const matchFull = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (matchFull) {
    const [_, year, month, day, hour, minute, second] = matchFull;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:${second}+09:00`;
  }
  // 日付のみ: "2024/9/11"
  const matchDate = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (matchDate) {
    const [_, year, month, day] = matchDate;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00+09:00`;
  }
  return null;
}

// 郵便番号クリーニング: "〒359-0025" → "3590025"
function cleanPostal(raw: string): string {
  return (raw || "").replace(/[〒\-\s(JP)]/g, "").trim();
}

// 住所クリーニング: "(JP)" を除去
function cleanAddress(raw: string): string {
  return (raw || "").replace(/\(JP\)\s*$/, "").trim();
}

type StagingRow = {
  source_phone: string;
  source_phone_normalized: string;
  source_name_raw: string;
  source_name: string;
  source_email: string;
  source_postal: string;
  source_address: string;
  product_name: string;
  amount: number;
  paid_at: string | null;
  csv_year: number | null;
  tenant_id: string;
};

async function main() {
  console.log("=== EMオンラインクリニック 決済データ仮投入 ===");
  console.log(`モード: ${isExec ? "本番実行" : "ドライラン"}`);
  console.log(`テナントID: ${tenantId}`);
  console.log(`CSVファイル: ${csvFile}`);
  console.log(`年度: ${csvYear || "未指定"}`);

  // 1. CSV読み込み（UTF-8）
  const raw = readFileSync(resolve(csvFile), "utf-8");
  const lines = raw.split("\n").map((l) => l.replace(/\r$/, "")).filter(Boolean);
  console.log(`\n読み込み行数: ${lines.length}`);

  // ヘッダ解析
  const header = parseCSVLine(lines[0]);
  console.log(`ヘッダ: ${header.slice(0, 8).join(" | ")}...`);

  // カラムインデックスをヘッダから動的特定
  const colDate = 0; // 常に最初のカラム
  const colName = header.findIndex((h) => h === "Name");
  const colPostal = header.findIndex((h) => h === "Postal Code");
  const colAddress = header.findIndex((h) => h === "Address");
  const colEmail = header.findIndex((h) => h === "Email");
  const colPhone = header.findIndex((h) => h === "Phone");
  const colProduct = header.findIndex((h) => h === "Product Name");
  // 金額: "Product Price" (2024) or "Price" (2025/2026)
  let colPrice = header.findIndex((h) => h === "Price");
  if (colPrice < 0) colPrice = header.findIndex((h) => h === "Product Price");

  console.log(`\nカラムインデックス: Date=${colDate}, Name=${colName}, Email=${colEmail}, Phone=${colPhone}, Product=${colProduct}, Price=${colPrice}`);

  if (colName < 0 || colPhone < 0 || colProduct < 0 || colPrice < 0) {
    console.error("必要なカラムが見つかりません。ヘッダを確認してください。");
    process.exit(1);
  }

  // 2. パースと変換
  const records: StagingRow[] = [];
  let parseErrors = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);

    const dateStr = fields[colDate] || "";
    // 日付っぽくない行はスキップ
    if (!/^\d{4}\//.test(dateStr)) {
      parseErrors++;
      if (parseErrors <= 5) {
        console.error(`  行${i + 1}: 日付形式不正: "${dateStr.substring(0, 30)}"`);
      }
      continue;
    }

    const name = fields[colName] || "";
    const phone = fields[colPhone] || "";
    const email = fields[colEmail] || "";
    const postal = fields[colPostal] || "";
    const address = fields[colAddress] || "";
    const product = fields[colProduct] || "";
    const amountRaw = fields[colPrice] || "";
    const amount = parseAmount(amountRaw);

    if (amount === 0 && !amountRaw) {
      parseErrors++;
      if (parseErrors <= 5) {
        console.error(`  行${i + 1}: 金額なし: name="${name}" product="${product}"`);
      }
      continue;
    }

    records.push({
      source_phone: phone,
      source_phone_normalized: normalizeJPPhone(phone),
      source_name_raw: name,
      source_name: cleanEmName(name),
      source_email: (email || "").toLowerCase().trim(),
      source_postal: cleanPostal(postal),
      source_address: cleanAddress(address),
      product_name: product,
      amount,
      paid_at: parseJstDateTime(dateStr),
      csv_year: csvYear ? parseInt(csvYear, 10) : null,
      tenant_id: tenantId!,
    });
  }

  console.log(`\nパース成功: ${records.length}件`);
  console.log(`パースエラー/スキップ: ${parseErrors}件`);

  // 統計
  const noPhone = records.filter((r) => !r.source_phone_normalized);
  const noEmail = records.filter((r) => !r.source_email);
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const uniquePhones = new Set(records.filter((r) => r.source_phone_normalized).map((r) => r.source_phone_normalized));

  console.log(`\n--- 統計 ---`);
  console.log(`電話番号なし: ${noPhone.length}件`);
  console.log(`メールなし: ${noEmail.length}件`);
  console.log(`金額合計: ${totalAmount.toLocaleString()}円`);
  console.log(`ユニーク電話番号: ${uniquePhones.size}件`);

  // 金額0の件数
  const zeroAmount = records.filter((r) => r.amount === 0);
  if (zeroAmount.length > 0) {
    console.log(`金額0件: ${zeroAmount.length}件`);
  }

  // 氏名クリーニング例
  const cleanedExamples = records.filter((r) => r.source_name !== r.source_name_raw).slice(0, 10);
  if (cleanedExamples.length > 0) {
    console.log(`\n--- 氏名クリーニング例 ---`);
    for (const ex of cleanedExamples) {
      console.log(`  "${ex.source_name_raw}" → "${ex.source_name}"`);
    }
  }

  // サンプル表示（最初の5件）
  console.log(`\n--- サンプル（最初の5件） ---`);
  for (const r of records.slice(0, 5)) {
    console.log(`  ${r.paid_at} | ${r.source_name} | ${r.source_phone_normalized} | ${r.product_name} | ${r.amount.toLocaleString()}円`);
  }

  if (!isExec) {
    console.log("\n[ドライラン] --exec フラグで本番実行してください");
    return;
  }

  // 3. em_order_stagingにバッチINSERT
  console.log("\nem_order_stagingテーブルにINSERT中...");
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/em_order_staging`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`バッチ ${i} INSERT失敗: ${res.status} ${errorText}`);
    }

    inserted += batch.length;
    console.log(`  進捗: ${inserted}/${records.length}`);
  }

  console.log(`\n=== 完了 ===`);
  console.log(`投入成功: ${inserted}件`);
  console.log(`金額合計: ${totalAmount.toLocaleString()}円`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
