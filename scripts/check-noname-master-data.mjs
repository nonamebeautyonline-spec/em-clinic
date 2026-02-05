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
  // 決済マスターAPIと同じクエリ
  const { data: orders } = await supabase
    .from("orders")
    .select("id, payment_method, tracking_number, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  console.log("=== 直近100件（決済マスターAPIと同じ）===");
  const withTracking = orders.filter(o => o.tracking_number && o.tracking_number.trim() !== "");
  const creditCard = orders.filter(o => o.payment_method === "credit_card");
  const creditCardWithTracking = creditCard.filter(o => o.tracking_number && o.tracking_number.trim() !== "");

  console.log("合計:", orders.length);
  console.log("クレカ:", creditCard.length);
  console.log("追跡番号あり:", withTracking.length);
  console.log("クレカで追跡あり:", creditCardWithTracking.length);

  console.log("\n=== 直近100件中、追跡番号ありの内訳 ===");
  withTracking.forEach((o, i) => {
    console.log(`${i+1}. ${o.payment_method} | ${o.tracking_number} | ${o.created_at?.slice(0,10)}`);
  });

  // 全追跡番号ありを確認（ページネーション）
  let allWithTracking = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("orders")
      .select("id, payment_method, tracking_number, created_at")
      .not("tracking_number", "is", null)
      .neq("tracking_number", "")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allWithTracking = allWithTracking.concat(data);
    offset += 1000;
  }

  console.log("\n=== 全体で追跡番号あり（ページネーション使用）===");
  console.log("合計:", allWithTracking.length);
  const ccWithTrack = allWithTracking.filter(o => o.payment_method === "credit_card");
  const btWithTrack = allWithTracking.filter(o => o.payment_method === "bank_transfer");
  console.log("クレカ:", ccWithTrack.length);
  console.log("銀行振込:", btWithTrack.length);

  // 最新の追跡番号付きクレカ注文
  console.log("\n=== 最新のクレカ追跡番号付き注文 ===");
  ccWithTrack.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  ccWithTrack.slice(0, 5).forEach((o, i) => {
    console.log(`${i+1}. ${o.id.slice(0, 20)}... | ${o.tracking_number} | ${o.created_at?.slice(0,10)}`);
  });
}

main().catch(console.error);
