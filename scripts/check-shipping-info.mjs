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
  // ordersテーブルのカラムを確認（サンプル1件）
  const { data: sampleOrder } = await supabase
    .from("orders")
    .select("*")
    .limit(1)
    .single();

  console.log("=== ordersテーブルのカラム ===");
  if (sampleOrder) {
    console.log(Object.keys(sampleOrder).join(", "));
  }

  // 直近の注文でshipping関連データがどうなっているか
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id, patient_id, patient_name, shipping_status, tracking_number, shipping_date, shipping_eta, carrier, paid_at")
    .order("paid_at", { ascending: false })
    .limit(10);

  console.log("\n=== 直近10件の注文のshipping関連 ===");
  if (recentOrders) {
    recentOrders.forEach(o => {
      console.log("order_id:", o.id);
      console.log("  patient_id:", o.patient_id, "/", o.patient_name || "(名前なし)");
      console.log("  paid_at:", o.paid_at ? o.paid_at.slice(0, 10) : "(null)");
      console.log("  shipping_status:", o.shipping_status);
      console.log("  tracking_number:", o.tracking_number);
      console.log("  shipping_date:", o.shipping_date);
      console.log("  shipping_eta:", o.shipping_eta);
      console.log("  carrier:", o.carrier);
      console.log("---");
    });
  }

  // GASから取得した注文と比較するため、特定患者のGASデータを確認
  console.log("\n=== GASからshipping情報取得テスト ===");
  const testPatientId = recentOrders && recentOrders[0] ? recentOrders[0].patient_id : null;

  if (testPatientId && envVars.GAS_MYPAGE_URL) {
    const gasUrl = envVars.GAS_MYPAGE_URL + "?type=getDashboard&patient_id=" + testPatientId;
    try {
      const gasRes = await fetch(gasUrl, { method: "GET" });
      const gasData = await gasRes.json();

      console.log("患者ID:", testPatientId);
      if (gasData.orders && gasData.orders.length > 0) {
        gasData.orders.slice(0, 3).forEach(o => {
          console.log("  GAS order_id:", o.id);
          console.log("    shipping_status:", o.shipping_status);
          console.log("    tracking_number:", o.tracking_number);
          console.log("    shipping_eta:", o.shipping_eta);
          console.log("    carrier:", o.carrier);
          console.log("  ---");
        });
      } else {
        console.log("  GASにorders情報なし");
      }
    } catch (e) {
      console.log("  GASエラー:", e.message);
    }
  }
}

main().catch(console.error);
