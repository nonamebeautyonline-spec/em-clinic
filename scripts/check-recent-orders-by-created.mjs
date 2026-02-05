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
  console.log("=== 直近100件の注文 (created_at降順) ===\n");

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, payment_method, tracking_number, created_at, paid_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.log("エラー:", error);
    return;
  }

  // 集計
  const stats = {
    total: orders.length,
    creditCard: 0,
    bankTransfer: 0,
    withTracking: 0,
    creditCardWithTracking: 0,
    bankTransferWithTracking: 0,
  };

  orders.forEach((o, i) => {
    const isBankTransfer = o.payment_method === "bank_transfer";
    const hasTracking = o.tracking_number && o.tracking_number.trim() !== "";

    if (isBankTransfer) {
      stats.bankTransfer++;
      if (hasTracking) stats.bankTransferWithTracking++;
    } else {
      stats.creditCard++;
      if (hasTracking) stats.creditCardWithTracking++;
    }
    if (hasTracking) stats.withTracking++;

    // 最初の20件を表示
    if (i < 20) {
      const method = isBankTransfer ? "銀振" : "クレカ";
      const tracking = hasTracking ? o.tracking_number : "(なし)";
      const date = o.created_at ? o.created_at.slice(0, 10) : "(null)";
      console.log(`${i+1}. ${o.id.substring(0, 30).padEnd(30)} | ${method} | 追跡:${tracking} | ${date}`);
    }
  });

  console.log("\n=== 統計 ===");
  console.log(`合計: ${stats.total}件`);
  console.log(`クレカ: ${stats.creditCard}件 (追跡あり: ${stats.creditCardWithTracking}件)`);
  console.log(`銀行振込: ${stats.bankTransfer}件 (追跡あり: ${stats.bankTransferWithTracking}件)`);
  console.log(`追跡番号あり合計: ${stats.withTracking}件`);
}

main().catch(console.error);
