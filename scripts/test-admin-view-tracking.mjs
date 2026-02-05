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

const ADMIN_TOKEN = envVars.ADMIN_TOKEN;
const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("=== 追跡番号がある患者のadmin view-mypage確認 ===\n");

  // 追跡番号がある注文を持つ患者を探す
  const { data: ordersWithTracking } = await supabase
    .from("orders")
    .select("patient_id, id, tracking_number, shipping_status, shipping_date")
    .not("tracking_number", "is", null)
    .neq("tracking_number", "")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!ordersWithTracking || ordersWithTracking.length === 0) {
    console.log("追跡番号がある注文がありません");
    return;
  }

  for (const order of ordersWithTracking) {
    const patientId = order.patient_id;

    console.log("============================================");
    console.log("患者ID:", patientId);
    console.log("【DBの注文データ】");
    console.log("  order_id:", order.id);
    console.log("  tracking_number:", order.tracking_number);
    console.log("  shipping_status:", order.shipping_status);
    console.log("  shipping_date:", order.shipping_date);

    // admin view-mypage APIを呼び出し
    try {
      const url = `${BASE_URL}/api/admin/view-mypage?patient_id=${patientId}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ADMIN_TOKEN}`,
        },
      });

      if (!res.ok) {
        console.log("\n【admin view-mypage APIエラー】", res.status);
        continue;
      }

      const data = await res.json();

      console.log("\n【admin view-mypage APIレスポンス】");
      if (data.data?.orders && data.data.orders.length > 0) {
        const matchingOrder = data.data.orders.find(o => o.id === order.id);
        if (matchingOrder) {
          console.log("  order_id:", matchingOrder.id);
          console.log("  trackingNumber:", matchingOrder.trackingNumber || "(undefined)");
          console.log("  shippingStatus:", matchingOrder.shippingStatus);
          console.log("  shippingEta:", matchingOrder.shippingEta || "(undefined)");
          console.log("  paymentMethod:", matchingOrder.paymentMethod || "(undefined)");
        } else {
          console.log("  該当orderがAPIレスポンスに見つかりません");
          console.log("  返ってきたorders:", data.data.orders.map(o => o.id).join(", "));
        }
      } else {
        console.log("  ordersが空です");
      }
    } catch (e) {
      console.log("  APIエラー:", e.message);
    }

    console.log("");
  }
}

main().catch(console.error);
