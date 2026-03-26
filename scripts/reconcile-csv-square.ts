// scripts/reconcile-csv-square.ts
// CSV全件とSquare APIデータを突合し、Squareにマッチしないレコード（＝振込）をstagingに投入
//
// 使い方:
//   npx tsx scripts/reconcile-csv-square.ts --file <CSV> --year <YYYY> --tenant-id <UUID>
//   npx tsx scripts/reconcile-csv-square.ts --file <CSV> --year <YYYY> --tenant-id <UUID> --cutoff 2026-03-21
//   末尾に --exec を付けると本番実行（振込レコードをstagingに投入）
//
// 突合ロジック:
//   CSV各行に対して、staging（source=square）のレコードを照合
//   照合キー: paid_at（日時差3時間以内）+ amount（金額一致）+ 氏名（距離≤3）
//   マッチしたCSV行 = クレカ（Squareで取得済み、投入しない）
//   マッチしないCSV行 = 振込としてstaging投入
//
// レポート:
//   1. マッチ件数 / 非マッチ件数（＝振込）
//   2. CSVで「クレジット」表記 & Squareにない = 「クレカ表記の振込疑い」リスト

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
const cutoffDate = getArg("cutoff");
const isExec = args.includes("--exec");

if (!csvFile || !tenantId || !csvYear) {
  console.error("使い方: npx tsx scripts/reconcile-csv-square.ts --file <CSV> --year <YYYY> --tenant-id <UUID> [--cutoff YYYY-MM-DD] [--exec]");
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

// レーベンシュタイン距離
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

// マルチライン対応CSVパーサー
function parseCSVWithMultiline(content: string): string[][] {
  const records: string[][] = [];
  let currentFields: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        currentFields.push(currentField.trim());
        currentField = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && i + 1 < content.length && content[i + 1] === "\n") {
          i++;
        }
        currentFields.push(currentField.trim());
        if (currentFields.length > 0 && currentFields.some((f) => f !== "")) {
          records.push(currentFields);
        }
        currentFields = [];
        currentField = "";
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField || currentFields.length > 0) {
    currentFields.push(currentField.trim());
    if (currentFields.length > 0 && currentFields.some((f) => f !== "")) {
      records.push(currentFields);
    }
  }

  return records;
}

// 金額パース
function parseAmount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[￥¥,、\s]/g, "");
  return parseInt(cleaned, 10) || 0;
}

// 日時パース（多様な形式対応）
function parseJstDateTime(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^[^\d]+/, "").trim();
  if (!cleaned) return null;

  const m1 = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m1) {
    const [_, y, mo, d, h, mi, s] = m1;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}:${s}+09:00`;
  }
  const m1b = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (m1b) {
    const [_, y, mo, d, h, mi] = m1b;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}:00+09:00`;
  }
  const m1c = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\/(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m1c) {
    const [_, y, mo, d, h, mi, s] = m1c;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}:${s}+09:00`;
  }
  const m2 = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m2) {
    const [_, y, mo, d] = m2;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00+09:00`;
  }
  const m3 = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m3) {
    const [_, mo, d, y, h, mi, s] = m3;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}:${s}+09:00`;
  }
  const m4 = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m4) {
    const [_, mo, d, y] = m4;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00+09:00`;
  }
  return null;
}

// 郵便番号クリーニング
function cleanPostal(raw: string): string {
  return (raw || "").replace(/[〒\-\s(JP)]/g, "").trim();
}

// 住所クリーニング
function cleanAddress(raw: string): string {
  return (raw || "").replace(/\(JP\)\s*$/, "").trim();
}

type CsvRow = {
  lineNum: number;
  dateStr: string;
  paidAt: string | null;
  nameRaw: string;
  name: string;
  phone: string;
  phoneNorm: string;
  email: string;
  postal: string;
  address: string;
  product: string;
  amount: number;
  csvMethod: string; // "クレジット" or "現金振込" or ""
};

type SquareRow = {
  id: number;
  paid_at: string;
  amount: number;
  source_name: string;
  source_phone_normalized: string;
  source_email: string;
  matched: boolean; // 突合済みフラグ
};

async function main() {
  console.log("=== CSV-Square突合スクリプト ===");
  console.log(`モード: ${isExec ? "本番実行" : "ドライラン"}`);
  console.log(`テナントID: ${tenantId}`);
  console.log(`CSVファイル: ${csvFile}`);
  console.log(`年度: ${csvYear}`);
  if (cutoffDate) console.log(`カットオフ: ${cutoffDate} 23:59:59 JST まで`);

  // 1. CSV読み込み
  const raw = readFileSync(resolve(csvFile!), "utf-8");
  const allRows = parseCSVWithMultiline(raw);
  const header = allRows[0];

  const colDate = 0;
  const colName = header.findIndex((h) => h === "Name");
  const colPostal = header.findIndex((h) => h === "Postal Code");
  const colAddress = header.findIndex((h) => h === "Address");
  const colEmail = header.findIndex((h) => h === "Email");
  const colPhone = header.findIndex((h) => h === "Phone");
  const colProduct = header.findIndex((h) => h === "Product Name");
  let colPrice = header.findIndex((h) => h === "Price");
  if (colPrice < 0) colPrice = header.findIndex((h) => h === "Product Price");
  let colCash = header.findIndex((h) => h === "cash");

  console.log(`カラムインデックス: Date=${colDate}, Name=${colName}, Phone=${colPhone}, Price=${colPrice}, Cash=${colCash}`);

  // CSVパース
  const csvRows: CsvRow[] = [];
  let parseErrors = 0;

  for (let i = 1; i < allRows.length; i++) {
    const fields = allRows[i];
    const dateStr = fields[colDate] || "";
    const dateStrCleaned = dateStr.replace(/^[^\d]+/, "").trim();
    if (!/^\d{1,4}\//.test(dateStrCleaned)) {
      parseErrors++;
      continue;
    }

    const paidAt = parseJstDateTime(dateStr);

    // cutoffフィルタ
    if (cutoffDate && paidAt) {
      const cutoffEnd = `${cutoffDate}T23:59:59+09:00`;
      if (paidAt > cutoffEnd) continue;
    }

    const name = fields[colName] || "";
    const phone = fields[colPhone] || "";
    const email = fields[colEmail] || "";
    const postal = fields[colPostal] || "";
    const address = fields[colAddress] || "";
    const product = fields[colProduct] || "";
    const amountRaw = fields[colPrice] || "";
    const amount = parseAmount(amountRaw);
    const csvMethod = colCash >= 0 ? (fields[colCash] || "").trim() : "";

    csvRows.push({
      lineNum: i + 1,
      dateStr,
      paidAt,
      nameRaw: name,
      name: cleanEmName(name),
      phone,
      phoneNorm: normalizeJPPhone(phone),
      email: (email || "").toLowerCase().trim(),
      postal: cleanPostal(postal),
      address: cleanAddress(address),
      product,
      amount,
      csvMethod,
    });
  }

  console.log(`\nCSVパース: ${csvRows.length}件（エラー: ${parseErrors}件）`);
  console.log(`  クレジット表記: ${csvRows.filter((r) => r.csvMethod === "クレジット").length}件`);
  console.log(`  現金振込表記: ${csvRows.filter((r) => r.csvMethod === "現金振込").length}件`);
  console.log(`  空/その他: ${csvRows.filter((r) => r.csvMethod !== "クレジット" && r.csvMethod !== "現金振込").length}件`);

  // 2. Square stagingデータ取得
  console.log(`\nSquare stagingデータ取得中...`);
  const squareRows: SquareRow[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/em_order_staging?tenant_id=eq.${tenantId}&source=eq.square&csv_year=eq.${csvYear}&select=id,paid_at,amount,source_name,source_phone_normalized,source_email&order=paid_at.asc&offset=${offset}&limit=${limit}`;
    const res = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY!,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });
    if (!res.ok) {
      throw new Error(`staging取得失敗: ${res.status} ${await res.text()}`);
    }
    const batch = (await res.json()) as Array<{
      id: number;
      paid_at: string;
      amount: number;
      source_name: string;
      source_phone_normalized: string;
      source_email: string;
    }>;
    for (const r of batch) {
      squareRows.push({ ...r, matched: false });
    }
    if (batch.length < limit) break;
    offset += limit;
  }

  console.log(`Square staging: ${squareRows.length}件`);

  // 3. 突合: 金額+日付(同日)+電話番号orメールで照合
  // ※ Squareの氏名は姓名逆順なので氏名照合は使わない
  // ※ 日付は同日（JSTベース）で判定

  // Squareを金額でインデックス化
  const squareByAmount = new Map<number, SquareRow[]>();
  for (const sq of squareRows) {
    const group = squareByAmount.get(sq.amount) || [];
    group.push(sq);
    squareByAmount.set(sq.amount, group);
  }

  // JSTの日付部分を取得するヘルパー
  function getJstDate(isoStr: string): string {
    // ISO文字列をJST（+9h）の日付にする
    const d = new Date(isoStr);
    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().slice(0, 10);
  }

  const matched: { csv: CsvRow; square: SquareRow; matchKey: string }[] = [];
  const unmatched: CsvRow[] = [];

  for (const csv of csvRows) {
    const candidates = squareByAmount.get(csv.amount);
    if (!candidates) {
      unmatched.push(csv);
      continue;
    }

    const csvDate = csv.paidAt ? csv.paidAt.slice(0, 10) : null; // YYYY-MM-DD (JST)

    let bestMatch: SquareRow | null = null;
    let matchKey = "";

    for (const sq of candidates) {
      if (sq.matched) continue;

      // Step 1: 金額一致 + 電話番号一致（最強キー）
      if (csv.phoneNorm && sq.source_phone_normalized &&
          csv.phoneNorm === sq.source_phone_normalized) {
        // 同日チェック（日付あれば）
        if (csvDate && sq.paid_at) {
          const sqDate = getJstDate(sq.paid_at);
          if (csvDate === sqDate) {
            bestMatch = sq;
            matchKey = "amount+phone+date";
            break; // 完全一致、これ以上探さない
          }
        }
        // 日付なしでも電話番号一致なら候補
        if (!bestMatch) {
          bestMatch = sq;
          matchKey = "amount+phone";
        }
        continue;
      }

      // Step 2: 金額一致 + メール一致
      if (csv.email && sq.source_email &&
          csv.email === sq.source_email) {
        if (csvDate && sq.paid_at) {
          const sqDate = getJstDate(sq.paid_at);
          if (csvDate === sqDate) {
            if (!bestMatch || matchKey !== "amount+phone+date") {
              bestMatch = sq;
              matchKey = "amount+email+date";
            }
            continue;
          }
        }
        if (!bestMatch || !matchKey.includes("phone")) {
          bestMatch = sq;
          matchKey = "amount+email";
        }
        continue;
      }

      // Step 3: 金額一致 + 同日（電話・メールなしの場合のみ、1:1であること）
      if (csvDate && sq.paid_at && !bestMatch) {
        const sqDate = getJstDate(sq.paid_at);
        if (csvDate === sqDate) {
          // 同日同額の候補が1件のみの場合だけマッチ
          const sameDateSameAmount = candidates.filter((c) => {
            if (c.matched) return false;
            if (!c.paid_at) return false;
            return getJstDate(c.paid_at) === csvDate;
          });
          if (sameDateSameAmount.length === 1) {
            bestMatch = sq;
            matchKey = "amount+date_unique";
          }
        }
      }
    }

    if (bestMatch) {
      bestMatch.matched = true;
      matched.push({ csv, square: bestMatch, matchKey });
    } else {
      unmatched.push(csv);
    }
  }

  // 4. レポート
  console.log(`\n=== 突合結果 ===`);
  console.log(`マッチ（クレカ、Square取得済み）: ${matched.length}件`);
  console.log(`非マッチ（振込としてstaging投入）: ${unmatched.length}件`);
  console.log(`Square未マッチ残り: ${squareRows.filter((r) => !r.matched).length}件`);

  // マッチキー別統計
  const matchKeyStats = new Map<string, number>();
  for (const m of matched) {
    matchKeyStats.set(m.matchKey, (matchKeyStats.get(m.matchKey) || 0) + 1);
  }
  console.log(`\nマッチキー別:`);
  for (const [key, count] of [...matchKeyStats.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key}: ${count}件`);
  }

  // 非マッチの内訳
  const unmatchedCredit = unmatched.filter((r) => r.csvMethod === "クレジット");
  const unmatchedBank = unmatched.filter((r) => r.csvMethod === "現金振込");
  const unmatchedOther = unmatched.filter((r) => r.csvMethod !== "クレジット" && r.csvMethod !== "現金振込");
  console.log(`\n非マッチ内訳:`);
  console.log(`  CSV「クレジット」表記: ${unmatchedCredit.length}件 ← ⚠️ クレカ表記の振込疑い`);
  console.log(`  CSV「現金振込」表記: ${unmatchedBank.length}件`);
  console.log(`  CSV表記なし/その他: ${unmatchedOther.length}件`);

  // クレカ表記の振込疑いリスト
  if (unmatchedCredit.length > 0) {
    console.log(`\n=== ⚠️ クレカ表記の振込疑いリスト（${unmatchedCredit.length}件） ===`);
    for (const r of unmatchedCredit.slice(0, 50)) {
      console.log(`  行${r.lineNum}: ${r.paidAt?.slice(0, 10) || "?"} | ${r.nameRaw} | ${r.phoneNorm} | ${r.email} | ${r.product} | ${r.amount.toLocaleString()}円`);
    }
    if (unmatchedCredit.length > 50) {
      console.log(`  ... 他 ${unmatchedCredit.length - 50}件`);
    }

    // CSVに出力
    const reportLines = ["行番号,日時,氏名,氏名(元),電話番号,メール,商品名,金額,CSV決済方法"];
    for (const r of unmatchedCredit) {
      reportLines.push(`${r.lineNum},${r.paidAt || ""},${r.name},"${r.nameRaw}",${r.phoneNorm},${r.email},\"${r.product}\",${r.amount},${r.csvMethod}`);
    }
    const reportPath = resolve(process.cwd(), `data/em-credit-suspect-${csvYear}.csv`);
    writeFileSync(reportPath, reportLines.join("\n"), "utf-8");
    console.log(`\nクレカ疑いレポート出力: ${reportPath}`);
  }

  // 金額集計
  const unmatchedTotal = unmatched.reduce((sum, r) => sum + r.amount, 0);
  const matchedTotal = matched.reduce((sum, r) => sum + r.csv.amount, 0);
  console.log(`\n金額集計:`);
  console.log(`  マッチ（クレカ）: ${matchedTotal.toLocaleString()}円`);
  console.log(`  非マッチ（振込投入対象）: ${unmatchedTotal.toLocaleString()}円`);

  if (!isExec) {
    console.log("\n[ドライラン] --exec フラグで本番実行してください");
    return;
  }

  // 5. 非マッチレコードをstagingにINSERT（source=csv_bank）
  console.log(`\nem_order_stagingに振込データINSERT中...`);
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < unmatched.length; i += batchSize) {
    const batch = unmatched.slice(i, i + batchSize).map((r) => ({
      source_phone: r.phone,
      source_phone_normalized: r.phoneNorm,
      source_name_raw: r.nameRaw,
      source_name: r.name,
      source_email: r.email,
      source_postal: r.postal,
      source_address: r.address,
      product_name: r.product,
      amount: r.amount,
      paid_at: r.paidAt,
      csv_year: parseInt(csvYear!, 10),
      tenant_id: tenantId!,
      source: "csv_bank",
    }));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/em_order_staging`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY!,
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
    console.log(`  進捗: ${inserted}/${unmatched.length}`);
  }

  console.log(`\n=== 完了 ===`);
  console.log(`振込として投入: ${inserted}件 / ${unmatchedTotal.toLocaleString()}円`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
