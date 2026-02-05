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
  console.log("=== ordersテーブルのデータ確認 ===\n");

  // COUNT
  const { count: totalCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  console.log("COUNT(*):", totalCount);

  // SELECT で全件取得
  const { data: allOrders, error } = await supabase
    .from("orders")
    .select("id");

  if (error) {
    console.log("エラー:", error);
    return;
  }

  console.log("SELECT id の件数:", allOrders?.length);

  // 念のため1000件ずつページング
  let total = 0;
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data } = await supabase
      .from("orders")
      .select("id")
      .range(offset, offset + pageSize - 1);

    if (!data || data.length === 0) break;
    total += data.length;
    console.log(`  page ${offset/pageSize + 1}: ${data.length}件`);
    offset += pageSize;
  }

  console.log("ページング合計:", total);

  // 直近10件を表示
  console.log("\n=== 直近10件 ===");
  const { data: recent } = await supabase
    .from("orders")
    .select("id, patient_id, paid_at, payment_method, tracking_number")
    .order("paid_at", { ascending: false })
    .limit(10);

  if (recent) {
    recent.forEach((o, i) => {
      console.log(`${i+1}. ${o.id} | ${o.patient_id} | ${o.payment_method || '(NULL)'} | 追跡:${o.tracking_number || '(なし)'}`);
    });
  }
}

main().catch(console.error);
