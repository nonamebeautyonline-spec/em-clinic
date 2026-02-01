// SupabaseのデータをGASシートに補完
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// 環境変数読み込み
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

if (!gasUrl) {
  console.error("❌ GAS_BANK_TRANSFER_URL が設定されていません");
  process.exit(1);
}

console.log("=== DBデータをGASシートに補完 ===\n");

// 実データのみ取得（TESTで始まらないpatient_id）
const { data: orders, error } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .not("patient_id", "like", "TEST%")
  .order("created_at", { ascending: true });

if (error) {
  console.error("❌ Supabase取得エラー:", error);
  process.exit(1);
}

console.log(`📊 実データ ${orders.length} 件を取得\n`);

for (const order of orders) {
  console.log(`🔄 処理中: ID=${order.id}, patient_id=${order.patient_id}`);

  const payload = {
    type: "bank_transfer_order",
    order_id: String(order.id),
    patient_id: order.patient_id,
    product_code: order.product_code,
    mode: order.mode || "first",
    reorder_id: order.reorder_id || null,
    account_name: order.account_name,
    phone_number: order.phone_number,
    email: order.email,
    postal_code: order.postal_code,
    address: order.address,
    submitted_at: order.submitted_at,
  };

  try {
    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (res.ok) {
      console.log(`  ✅ GAS送信成功: ${JSON.stringify(json)}`);
    } else {
      console.log(`  ❌ GAS送信失敗 (${res.status}): ${JSON.stringify(json)}`);
    }
  } catch (e) {
    console.error(`  ❌ エラー: ${e.message}`);
  }

  // レート制限回避のため少し待機
  await new Promise(resolve => setTimeout(resolve, 500));
}

console.log("\n=== 補完完了 ===");
console.log("\n次のステップ:");
console.log("  1. GASスプレッドシートを開く");
console.log("  2. 「2026-01 住所情報」シートを確認");
console.log(`  3. ${orders.length} 件のデータが記録されているか確認`);
