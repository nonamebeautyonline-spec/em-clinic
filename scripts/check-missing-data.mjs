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
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== GASシート未記録データ確認 ===\n");

// スプレッドシートに記録されているpatient_id（実データのみ）
const recordedIds = [
  "20251200394",  // 行8
  "20251200404",  // 行9
  "20260101509",  // 行10
  "20251200009",  // 行11
];

// Supabaseの全実データを取得
const { data: allOrders, error } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .not("patient_id", "like", "TEST%")
  .order("created_at", { ascending: true });

if (error) {
  console.error("❌ エラー:", error);
  process.exit(1);
}

console.log(`Supabase実データ: ${allOrders.length} 件`);
console.log(`GASシート実データ: ${recordedIds.length} 件\n`);

// 不足しているデータを特定
const missingOrders = allOrders.filter(o => !recordedIds.includes(o.patient_id));

if (missingOrders.length === 0) {
  console.log("✅ 全てのデータが記録されています");
} else {
  console.log(`❌ ${missingOrders.length} 件のデータが未記録です:\n`);

  missingOrders.forEach((order, i) => {
    console.log(`${i + 1}. ID: ${order.id}`);
    console.log(`   patient_id: ${order.patient_id}`);
    console.log(`   product_code: ${order.product_code}`);
    console.log(`   mode: ${order.mode || "(なし)"}`);
    console.log(`   reorder_id: ${order.reorder_id || "(なし)"}`);
    console.log(`   account_name: ${order.account_name}`);
    console.log(`   phone_number: ${order.phone_number}`);
    console.log(`   email: ${order.email}`);
    console.log(`   postal_code: ${order.postal_code}`);
    console.log(`   address: ${order.address}`);
    console.log(`   created_at: ${order.created_at}`);
    console.log(`   submitted_at: ${order.submitted_at}`);
    console.log();
  });

  console.log("📝 これらのデータをGASスプレッドシートに手動で追加する必要があります。");
  console.log("または、今後の新規ユーザーは自動的に記録されるため、これらは過去データとして残します。");
}

console.log("\n=== 確認完了 ===");
