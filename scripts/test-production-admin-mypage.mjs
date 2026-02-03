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

const adminToken = envVars.ADMIN_TOKEN;
const patientId = "20260101640"; // 返金テスト患者

console.log("=== 本番環境 Admin Mypage API テスト ===");
console.log(`患者ID: ${patientId}\n`);

const url = `https://noname-beauty.jp/api/admin/view-mypage?patient_id=${patientId}`;

try {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${adminToken}`,
    },
  });

  if (!response.ok) {
    console.error(`❌ エラー: ${response.status} ${response.statusText}`);
    const errorText = await response.text();
    console.error(errorText);
    process.exit(1);
  }

  const result = await response.json();
  const data = result.data || result;

  console.log("【患者情報】");
  console.log(`  患者ID: ${data.patient?.patient_id || "(なし)"}`);
  console.log(`  患者名: ${data.patient?.name || "(なし)"}`);
  console.log();

  console.log("【注文データ】");
  if (data.orders && data.orders.length > 0) {
    console.log(`  注文数: ${data.orders.length}件\n`);

    data.orders.forEach((order, idx) => {
      console.log(`[${idx + 1}] ${order.id}`);
      console.log(`    商品: ${order.productName}`);
      console.log(`    金額: ¥${order.amount?.toLocaleString()}`);
      console.log(`    決済方法: ${order.paymentMethod}`);
      console.log(`    ステータス: ${order.paymentStatus}`);
      console.log(`    返金ステータス: ${order.refundStatus || "(なし)"}`);
      if (order.refundedAt) {
        console.log(`    返金日時: ${order.refundedAt}`);
      }
      console.log();
    });

    // 返金された注文を確認
    const refundedOrders = data.orders.filter(o => o.refundStatus === "COMPLETED");
    console.log(`\n✅ 返金された注文: ${refundedOrders.length}件`);
    if (refundedOrders.length > 0) {
      refundedOrders.forEach(o => {
        console.log(`   - ${o.id}: ¥${o.amount?.toLocaleString()}`);
      });
    }
  } else {
    console.log("  ⚠️ 注文なし");
  }

  console.log("\n【配送カード】");
  if (data.shipping_cards && data.shipping_cards.length > 0) {
    console.log(`  配送カード数: ${data.shipping_cards.length}件`);
  } else {
    console.log("  配送カードなし");
  }

  console.log("\n✅ テスト完了");

} catch (err) {
  console.error("❌ エラー:", err.message);
}
