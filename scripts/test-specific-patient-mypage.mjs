// 特定患者のマイページ表示テスト
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

const adminToken = envVars.ADMIN_TOKEN;
const testPatientId = "20260100903"; // マツモトミハネ

console.log("=== 特定患者 マイページ表示テスト ===\n");
console.log(`患者ID: ${testPatientId}\n`);

// 1. キャッシュを削除
console.log("【1. キャッシュ削除】");
try {
  const invalidateUrl = `http://localhost:3000/api/admin/invalidate-cache`;
  const response = await fetch(invalidateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ patient_id: testPatientId }),
  });

  if (response.ok) {
    console.log("✅ キャッシュ削除成功\n");
  } else {
    console.error("❌ キャッシュ削除失敗:", await response.text(), "\n");
  }
} catch (e) {
  console.error("❌ エラー:", e.message, "\n");
}

// 2. Supabaseで注文を確認
console.log("【2. Supabase直接確認】");

const { data: creditOrders } = await supabase
  .from("orders")
  .select("id, product_code, amount")
  .eq("patient_id", testPatientId);

const { data: bankOrders } = await supabase
  .from("bank_transfer_orders")
  .select("id, product_code, status")
  .eq("patient_id", testPatientId);

console.log(`クレカ決済: ${creditOrders?.length || 0} 件`);
console.log(`銀行振込: ${bankOrders?.length || 0} 件`);

if (bankOrders && bankOrders.length > 0) {
  bankOrders.forEach(o => {
    console.log(`  - 銀行振込 ID: ${o.id}, ${o.product_code}, status: ${o.status}`);
  });
}
console.log();

// 3. マイページAPIを呼び出し
console.log("【3. マイページAPI呼び出し】");

try {
  const response = await fetch("http://localhost:3000/api/mypage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `patient_id=${testPatientId}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ API失敗:", response.status, data);
    process.exit(1);
  }

  console.log(`✅ API成功`);
  console.log(`注文数: ${data.orders?.length || 0} 件\n`);

  if (data.orders && data.orders.length > 0) {
    data.orders.forEach((o, i) => {
      console.log(`${i + 1}. ${o.productName}`);
      console.log(`   ID: ${o.id}`);
      console.log(`   金額: ${o.amount}円`);
      console.log(`   決済方法: ${o.paymentMethod || "(未設定)"}`);
      console.log(`   配送状況: ${o.shippingStatus}`);
      console.log();
    });

    // 決済方法の統計
    const creditCount = data.orders.filter(o => o.paymentMethod === "credit_card").length;
    const bankCount = data.orders.filter(o => o.paymentMethod === "bank_transfer").length;
    const unknownCount = data.orders.filter(o => !o.paymentMethod).length;

    console.log(`📊 決済方法の内訳:`);
    console.log(`   クレカ: ${creditCount} 件`);
    console.log(`   銀行振込: ${bankCount} 件`);
    if (unknownCount > 0) {
      console.log(`   未設定: ${unknownCount} 件 ⚠️`);
    }
  } else {
    console.log("⚠️ 注文が0件です");
  }

} catch (e) {
  console.error("❌ エラー:", e.message);
}

console.log("\n=== テスト完了 ===");
