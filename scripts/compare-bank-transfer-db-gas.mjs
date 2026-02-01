// 銀行振込データ: DB vs GASシート 比較
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

const gasUrl = envVars.GAS_BANK_TRANSFER_URL;

console.log("=== 銀行振込データ比較: DB vs GASシート ===\n");

// 1. Supabaseから実データを取得
console.log("【1. Supabase データ取得】");
const { data: dbOrders, error } = await supabase
  .from("bank_transfer_orders")
  .select("id, patient_id, product_code, mode, reorder_id, account_name, phone_number, email, postal_code, address, status, created_at, confirmed_at")
  .not("patient_id", "like", "TEST%")
  .order("id", { ascending: true });

if (error) {
  console.error("❌ エラー:", error);
  process.exit(1);
}

console.log(`DB件数: ${dbOrders.length} 件\n`);

dbOrders.forEach(o => {
  console.log(`ID: ${o.id}`);
  console.log(`  patient_id: ${o.patient_id}`);
  console.log(`  product_code: ${o.product_code}`);
  console.log(`  mode: ${o.mode || "(null)"}`);
  console.log(`  reorder_id: ${o.reorder_id || "(null)"}`);
  console.log(`  account_name: ${o.account_name}`);
  console.log(`  status: ${o.status}`);
  console.log();
});

// 2. GASシートからデータを取得
console.log("\n【2. GASシート データ取得】");

try {
  const response = await fetch(`${gasUrl}?type=get_all_orders&sheet=2026-01 住所情報`);

  if (!response.ok) {
    console.error("❌ GAS呼び出し失敗:", response.status);
    console.log("\n⚠️ GASにget_all_orders関数がないため、手動確認が必要です");
    console.log("\n📝 次の手順で確認してください:");
    console.log("  1. GASスプレッドシート「2026-01 住所情報」を開く");
    console.log("  2. データ行数を確認");
    console.log(`  3. DB件数 ${dbOrders.length} 件と一致するか確認`);
    console.log("\n【DB患者ID一覧】");
    dbOrders.forEach((o, i) => {
      console.log(`  ${i + 1}. ${o.patient_id} (ID: ${o.id}, mode: ${o.mode || "null"})`);
    });
  } else {
    const gasData = await response.json();
    console.log(`GASシート件数: ${gasData.orders?.length || 0} 件\n`);

    if (gasData.orders) {
      gasData.orders.forEach(o => {
        console.log(`行${o.row}: patient_id=${o.patient_id}, mode=${o.mode}`);
      });
    }
  }
} catch (e) {
  console.error("❌ GAS呼び出しエラー:", e.message);
  console.log("\n📝 手動確認が必要です:");
  console.log("  GASスプレッドシート「2026-01 住所情報」を開いて、以下を確認してください:\n");

  console.log("【DBに存在する実データ】");
  console.log("以下の患者IDがGASシートに全て記録されているか確認:\n");

  dbOrders.forEach((o, i) => {
    console.log(`${i + 1}. patient_id: ${o.patient_id}`);
    console.log(`   注文ID: ${o.id}`);
    console.log(`   商品: ${o.product_code}`);
    console.log(`   モード: ${o.mode || "(未設定)"}`);
    console.log(`   再購入ID: ${o.reorder_id || "(空欄)"}`);
    console.log(`   口座名義: ${o.account_name}`);
    console.log(`   電話: ${o.phone_number}`);
    console.log(`   郵便番号: ${o.postal_code}`);
    console.log(`   住所: ${o.address}`);
    console.log();
  });

  console.log("\n✅ 確認ポイント:");
  console.log(`  - GASシート行数が ${dbOrders.length} 件（+ヘッダー1行）あるか`);
  console.log("  - 各patient_idが正しく記録されているか");
  console.log("  - モード（E列）と再購入ID（F列）が正しく入っているか");
  console.log("  - ステータス（L列）が全て「confirmed」になっているか");
}

console.log("\n=== 比較完了 ===");
