import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// .env.localを読み込む
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTodayShippingList() {
  // 今日の0時〜23:59:59の範囲
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = tomorrow.toISOString();

  console.log(`Checking orders with shipping_list_created_at between ${todayStart} and ${tomorrowStart}`);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, patient_id, shipping_list_created_at, created_at")
    .gte("shipping_list_created_at", todayStart)
    .lt("shipping_list_created_at", tomorrowStart)
    .order("shipping_list_created_at", { ascending: true });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`\nFound ${orders.length} orders with shipping_list_created_at today`);

  // patient_idでグループ化
  const grouped = {};
  for (const order of orders) {
    if (!grouped[order.patient_id]) {
      grouped[order.patient_id] = [];
    }
    grouped[order.patient_id].push(order);
  }

  // 患者名を取得
  const patientIds = Object.keys(grouped);
  const { data: patients } = await supabase
    .from("intake")
    .select("patient_id, patient_name")
    .in("patient_id", patientIds);

  const patientMap = {};
  if (patients) {
    for (const p of patients) {
      patientMap[p.patient_id] = p.patient_name;
    }
  }

  // 患者ごとに表示
  console.log("\n=== Orders by Patient ===");
  let total = 0;
  const patientList = Object.entries(grouped).sort((a, b) => {
    const nameA = patientMap[a[0]] || "";
    const nameB = patientMap[b[0]] || "";
    return nameA.localeCompare(nameB);
  });

  for (const [patientId, orderList] of patientList) {
    const patientName = patientMap[patientId] || "Unknown";
    console.log(`\n${patientName} (${patientId}):`);
    for (const order of orderList) {
      console.log(`  - ${order.id} (created: ${order.created_at}, list_created: ${order.shipping_list_created_at})`);
      total++;
    }
    if (orderList.length > 1) {
      console.log(`  → ${orderList.length}件 (同じ患者)`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total orders: ${total}`);
  console.log(`Unique patients: ${patientList.length}`);
  console.log(`Patients with multiple orders: ${patientList.filter(([, orders]) => orders.length > 1).length}`);
}

checkTodayShippingList();
