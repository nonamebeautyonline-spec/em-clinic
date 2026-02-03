import { createClient } from "@supabase/supabase-js";
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

console.log("=== GASシートの返金データとordersテーブルの照合 ===\n");

// 1. Supabaseのordersから返金データを取得
console.log("【1. Supabaseのordersテーブルから返金データを取得】");
const { data: ordersRefunds, error: ordersError } = await supabase
  .from("orders")
  .select("id, patient_id, amount, status, refund_status, refunded_at, refunded_amount, created_at")
  .or("refund_status.eq.COMPLETED,refund_status.eq.PENDING,refund_status.eq.FAILED,status.eq.refunded")
  .order("refunded_at", { ascending: false });

if (ordersError) {
  console.error("❌ エラー:", ordersError);
  process.exit(1);
}

console.log(`返金データ件数: ${ordersRefunds?.length || 0}件\n`);

if (ordersRefunds && ordersRefunds.length > 0) {
  console.log("Supabase ordersテーブルの返金一覧:");
  ordersRefunds.forEach((order, idx) => {
    console.log(`[${idx + 1}] ${order.id}`);
    console.log(`    patient_id: ${order.patient_id}`);
    console.log(`    amount: ¥${order.amount?.toLocaleString()}`);
    console.log(`    status: ${order.status}`);
    console.log(`    refund_status: ${order.refund_status || "(null)"}`);
    console.log(`    refunded_at: ${order.refunded_at || "(null)"}`);
    console.log(`    refunded_amount: ${order.refunded_amount ? '¥' + order.refunded_amount.toLocaleString() : "(null)"}`);
    console.log();
  });
} else {
  console.log("⚠️ 返金データなし\n");
}

// 2. GASシートからSquare webhook履歴を取得する必要がある
// GASにSquare webhook履歴を取得するエンドポイントがあるか確認
console.log("【2. Square APIから返金履歴を取得】");
console.log("Square APIを使って返金履歴を確認します...\n");

// Square APIから返金を取得
const SQUARE_ACCESS_TOKEN = envVars.SQUARE_ACCESS_TOKEN;
const SQUARE_ENV = envVars.SQUARE_ENV || "production";
const baseUrl = SQUARE_ENV === "sandbox"
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";

if (!SQUARE_ACCESS_TOKEN) {
  console.log("⚠️ SQUARE_ACCESS_TOKENが設定されていません");
  process.exit(0);
}

try {
  // Square APIで最近の返金を取得
  const response = await fetch(`${baseUrl}/v2/refunds?limit=100`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
      "Square-Version": "2024-04-17",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    console.error(`❌ Square API エラー: ${response.status}`);
    const errorText = await response.text();
    console.error(errorText);
  } else {
    const data = await response.json();
    const refunds = data.refunds || [];

    console.log(`Square APIの返金件数: ${refunds.length}件\n`);

    if (refunds.length > 0) {
      console.log("Square APIの返金一覧:");
      refunds.forEach((refund, idx) => {
        const paymentId = refund.payment_id || "(不明)";
        const status = refund.status || "(不明)";
        const amount = refund.amount_money?.amount ? (refund.amount_money.amount / 100) : 0;
        const createdAt = refund.created_at || "(不明)";

        console.log(`[${idx + 1}] Refund ID: ${refund.id}`);
        console.log(`    payment_id: ${paymentId}`);
        console.log(`    status: ${status}`);
        console.log(`    amount: ¥${amount.toLocaleString()}`);
        console.log(`    created_at: ${createdAt}`);

        // ordersテーブルに存在するか確認
        const matchingOrder = ordersRefunds?.find(o => o.id === paymentId);
        if (matchingOrder) {
          console.log(`    ✅ ordersテーブルに存在`);
          if (matchingOrder.refund_status === "COMPLETED") {
            console.log(`    ✅ refund_status: COMPLETED`);
          } else {
            console.log(`    ⚠️ refund_status: ${matchingOrder.refund_status || "(null)"} - 要更新`);
          }
        } else {
          console.log(`    ❌ ordersテーブルに存在しない - payment_id: ${paymentId}`);
        }
        console.log();
      });

      // 3. 不一致の確認
      console.log("\n【3. 不一致の確認】");

      const squarePaymentIds = refunds
        .filter(r => r.status === "COMPLETED")
        .map(r => r.payment_id);

      const missingInOrders = squarePaymentIds.filter(paymentId =>
        !ordersRefunds?.find(o => o.id === paymentId && o.refund_status === "COMPLETED")
      );

      if (missingInOrders.length > 0) {
        console.log(`⚠️ Square APIには存在するが、ordersテーブルで refund_status=COMPLETED でない: ${missingInOrders.length}件`);
        missingInOrders.forEach(paymentId => {
          console.log(`  - ${paymentId}`);
        });
      } else {
        console.log("✅ すべての返金がordersテーブルに正しく反映されています");
      }
    }
  }
} catch (error) {
  console.error("❌ Square API呼び出しエラー:", error.message);
}

console.log("\n=== 完了 ===");
