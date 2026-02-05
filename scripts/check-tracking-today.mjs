import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const today = new Date().toISOString().split("T")[0];

// 発送済み追跡番号
const shippedTracking = fs.readFileSync("/tmp/shipped_tracking.txt", "utf8")
  .trim().split("\n").map(t => t.trim());
const shippedSet = new Set(shippedTracking);
console.log("発送済み追跡番号:", shippedSet.size + "個");

// DBの今日発送
const { data: orders } = await supabase
  .from("orders")
  .select("id, patient_id, tracking_number")
  .eq("shipping_date", today)
  .not("tracking_number", "is", null);

const dbTracking = [...new Set(orders.map(o => o.tracking_number))];
console.log("DB追跡番号:", dbTracking.length + "個");

// DBにあるけど発送済みリストにない
const diff = dbTracking.filter(t => !shippedSet.has(t));
console.log("");
console.log("=== DBにあるけど発送リストにない追跡番号 ===");
console.log(diff.length + "個");

if (diff.length > 0) {
  for (const tn of diff) {
    const order = orders.find(o => o.tracking_number === tn);
    const { data: intake } = await supabase
      .from("intake")
      .select("patient_id, patient_name, answerer_id")
      .eq("patient_id", order.patient_id)
      .single();

    console.log("");
    console.log("追跡番号:", tn);
    console.log("注文ID:", order.id);
    console.log("患者:", intake?.patient_name || order.patient_id);
    console.log("answerer_id:", intake?.answerer_id || "なし");
  }
}
