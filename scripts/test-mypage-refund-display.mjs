import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables
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

const patientId = "20260101640";

console.log("=== マイページAPI返金表示テスト ===");
console.log(`患者ID: ${patientId}\n`);

try {
  const response = await fetch("http://localhost:3000/api/mypage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ patient_id: patientId }),
  });

  if (!response.ok) {
    console.error(`エラー: ${response.status} ${response.statusText}`);
    const errorText = await response.text();
    console.error(errorText);
    process.exit(1);
  }

  const data = await response.json();

  console.log("【1. 患者情報】");
  console.log(`  患者ID: ${data.patient?.patient_id || "(なし)"}`);
  console.log(`  患者名: ${data.patient?.name || "(なし)"}`);
  console.log();

  console.log("【2. 注文情報】");
  console.log(`  注文数: ${data.orders?.length || 0}件\n`);

  if (data.orders && data.orders.length > 0) {
    data.orders.forEach((order, idx) => {
      console.log(`[${idx + 1}] ${order.id || order.payment_id}`);
      console.log(`    商品: ${order.product_name || order.product_code}`);
      console.log(`    金額: ${order.amount ? order.amount.toLocaleString() + "円" : "(不明)"}`);
      console.log(`    決済方法: ${order.payment_method}`);
      console.log(`    ステータス: ${order.status}`);

      if (order.status === "refunded" || order.refunded_at) {
        console.log(`    ✅ 返金済み: ${order.refunded_at || "(日時不明)"}`);
      }

      console.log(`    作成日: ${order.created_at || "(不明)"}`);
      console.log();
    });

    // 返金された注文を確認
    const refundedOrders = data.orders.filter(o => o.status === "refunded" || o.refunded_at);
    if (refundedOrders.length > 0) {
      console.log(`✅ 返金された注文: ${refundedOrders.length}件`);
      refundedOrders.forEach(o => {
        console.log(`   - ${o.id || o.payment_id}: ${o.amount?.toLocaleString()}円`);
      });
    } else {
      console.log("⚠️ 返金された注文が見つかりません");
    }
  } else {
    console.log("注文が見つかりません");
  }

  console.log();
  console.log("【3. 配送情報】");
  if (data.shipping_cards && data.shipping_cards.length > 0) {
    console.log(`  配送カード数: ${data.shipping_cards.length}件\n`);
    data.shipping_cards.forEach((card, idx) => {
      console.log(`[${idx + 1}] ${card.title || "配送情報"}`);
      console.log(`    注文ID: ${card.order_id || "(不明)"}`);
      console.log(`    ステータス: ${card.status || "(不明)"}`);
      console.log(`    追跡番号: ${card.tracking_number || "(未設定)"}`);
      console.log();
    });
  } else {
    console.log("  配送情報なし");
  }

} catch (err) {
  console.error("エラー:", err.message);
  console.log("\nローカル環境が起動していない可能性があります。");
  console.log("本番環境で確認する場合は、以下のコマンドを実行してください:");
  console.log();
  console.log(`curl -X POST https://your-domain.vercel.app/api/mypage \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"patient_id": "${patientId}"}'`);
}
