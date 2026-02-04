import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

// CSVファイルパスを引数から取得
const csvPath = process.argv[2];
if (!csvPath) {
  console.error("使用方法: node update-shipping-date-from-b2.mjs <B2_CSV_PATH>");
  console.error("例: node update-shipping-date-from-b2.mjs ~/Downloads/b2_export.csv");
  process.exit(1);
}

async function main() {
  console.log("=== B2 CSVから発送日を更新 ===\n");
  console.log(`CSVファイル: ${csvPath}\n`);

  // CSVを読み込み
  let csvContent;
  try {
    csvContent = readFileSync(resolve(csvPath), "utf-8");
  } catch (e) {
    console.error("❌ CSVファイルを読み込めません:", e.message);
    process.exit(1);
  }

  const lines = csvContent.split("\n").filter(line => line.trim());
  console.log(`行数: ${lines.length}\n`);

  // ヘッダーをスキップして処理
  // B2 CSV形式: ... E列が日付(2026/02/01), ... 追跡番号カラムを探す
  // 一般的なB2形式を想定：追跡番号は伝票番号列

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));

    // E列（インデックス4）が日付
    const dateStr = cols[4];
    // 追跡番号を探す - 12桁の数字を含む列を探す
    let trackingNumber = null;
    for (const col of cols) {
      const cleaned = col.replace(/[^\d]/g, "");
      if (cleaned.length === 12 && /^\d+$/.test(cleaned)) {
        trackingNumber = cleaned;
        break;
      }
    }

    if (!trackingNumber || !dateStr) {
      continue;
    }

    // 日付を変換 (2026/02/01 -> 2026-02-01)
    const dateParts = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (!dateParts) {
      continue;
    }
    const shippingDate = `${dateParts[1]}-${dateParts[2].padStart(2, "0")}-${dateParts[3].padStart(2, "0")}`;

    // DBを更新（追跡番号でマッチング）
    const { data, error } = await supabase
      .from("orders")
      .update({ shipping_date: shippingDate })
      .eq("tracking_number", trackingNumber)
      .select("id, tracking_number, shipping_date");

    if (error) {
      console.error(`❌ ${trackingNumber}: ${error.message}`);
      errors++;
    } else if (!data || data.length === 0) {
      notFound++;
    } else {
      updated++;
      if (updated <= 10) {
        console.log(`✅ ${trackingNumber} -> ${shippingDate}`);
      }
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`更新成功: ${updated}件`);
  console.log(`見つからず: ${notFound}件`);
  console.log(`エラー: ${errors}件`);

  // 確認
  console.log("\n発送日分布（更新後）:");
  const { data: check } = await supabase
    .from("orders")
    .select("shipping_date")
    .not("tracking_number", "is", null)
    .neq("tracking_number", "")
    .eq("payment_method", "credit_card");

  const byDate = {};
  (check || []).forEach(o => {
    const d = o.shipping_date || "null";
    byDate[d] = (byDate[d] || 0) + 1;
  });

  Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-10)
    .forEach(([date, count]) => {
      console.log(`  ${date}: ${count}件`);
    });
}

main().catch(console.error);
