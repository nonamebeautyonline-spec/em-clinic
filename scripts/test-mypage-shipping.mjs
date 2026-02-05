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
  console.log("=== tracking_numberがある患者のmypageレスポンス確認 ===\n");

  // tracking_numberがある注文を持つ患者を探す
  const { data: ordersWithTracking } = await supabase
    .from("orders")
    .select("patient_id, id, tracking_number, shipping_status, shipping_date")
    .not("tracking_number", "is", null)
    .neq("tracking_number", "")
    .order("created_at", { ascending: false })
    .limit(3);

  if (!ordersWithTracking || ordersWithTracking.length === 0) {
    console.log("tracking_numberがある注文がありません");
    return;
  }

  for (const order of ordersWithTracking) {
    const patientId = order.patient_id;

    console.log("============================================");
    console.log("患者ID:", patientId);
    console.log("【DB注文データ】");
    console.log("  order_id:", order.id);
    console.log("  tracking_number:", order.tracking_number);
    console.log("  shipping_status:", order.shipping_status);
    console.log("  shipping_date:", order.shipping_date);

    // mypage APIを呼び出し（ローカル）
    try {
      const mypageRes = await fetch("http://localhost:3000/api/mypage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId }),
      });

      const mypageData = await mypageRes.json();

      console.log("\n【mypage APIレスポンス】");
      if (mypageData.orders && mypageData.orders.length > 0) {
        const matchingOrder = mypageData.orders.find(o => o.id === order.id);
        if (matchingOrder) {
          console.log("  order_id:", matchingOrder.id);
          console.log("  trackingNumber:", matchingOrder.trackingNumber || "(undefined)");
          console.log("  shippingStatus:", matchingOrder.shippingStatus);
          console.log("  shippingEta:", matchingOrder.shippingEta || "(undefined)");
          console.log("  carrier:", matchingOrder.carrier || "(undefined)");
        } else {
          console.log("  該当orderがAPIレスポンスに見つかりません");
          console.log("  返ってきたorders:", mypageData.orders.map(o => o.id).join(", "));
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
