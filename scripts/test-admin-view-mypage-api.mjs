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

console.log("=== 管理画面マイページAPIテスト ===");
console.log(`患者ID: ${patientId}\n`);

try {
  const response = await fetch(`http://localhost:3000/api/admin/view-mypage?patient_id=${patientId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${envVars.ADMIN_TOKEN}`,
    },
  });

  if (!response.ok) {
    console.error(`エラー: ${response.status} ${response.statusText}`);
    const errorText = await response.text();
    console.error(errorText);
    process.exit(1);
  }

  const result = await response.json();
  const data = result.data || result;

  console.log("【注文データ】");
  if (data.orders && data.orders.length > 0) {
    data.orders.forEach((order, idx) => {
      console.log(`\n[${idx + 1}] ${order.id}`);
      console.log(`  productName: ${order.productName}`);
      console.log(`  paymentStatus: ${order.paymentStatus}`);
      console.log(`  refundStatus: ${order.refundStatus || "(null)"}`);
      console.log(`  refundedAt: ${order.refundedAt || "(null)"}`);
      console.log(`  refundedAmount: ${order.refundedAmount || "(null)"}`);
      console.log(`  paidAt: ${order.paidAt || "(null)"}`);
    });
  } else {
    console.log("注文なし");
  }

  // 返金済みの注文を確認
  const refundedOrders = data.orders?.filter(o => o.refundStatus === "COMPLETED") || [];
  console.log(`\n\n【返金済み注文】: ${refundedOrders.length}件`);
  refundedOrders.forEach(o => {
    console.log(`  - ${o.id}: ${o.refundedAmount ? '¥' + o.refundedAmount.toLocaleString() : '(金額不明)'}`);
  });

} catch (err) {
  console.error("エラー:", err.message);
}
