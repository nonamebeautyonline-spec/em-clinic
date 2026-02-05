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

async function main() {
  // 全追跡番号ありを取得
  let all = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("orders")
      .select("id, payment_method, tracking_number, shipping_date")
      .not("tracking_number", "is", null)
      .neq("tracking_number", "")
      .eq("payment_method", "credit_card")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    offset += 1000;
  }

  console.log("=== クレカ追跡番号のshipping_date分布 ===");
  console.log("総数:", all.length);

  // 日付別に集計
  const byDate = {};
  all.forEach(o => {
    const date = o.shipping_date || "null";
    byDate[date] = (byDate[date] || 0) + 1;
  });

  // 日付順にソート
  const sorted = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]));

  console.log("\n日付別件数:");
  sorted.forEach(([date, count]) => {
    console.log(`  ${date}: ${count}件`);
  });

  // 12/15〜2/1の範囲
  const dec15toFeb1 = all.filter(o => {
    const d = o.shipping_date;
    return d && d >= "2025-12-15" && d <= "2026-02-01";
  });
  console.log("\n2025/12/15〜2026/02/01の件数:", dec15toFeb1.length);
}

main().catch(console.error);
