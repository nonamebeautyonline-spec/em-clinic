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
  console.log("=== 追跡番号更新状況の徹底調査 ===\n");

  // 1. 最近updated_atが更新されたクレカ注文（追跡付与されたはず）
  console.log("【1】最近7日間でupdated_atが更新されたクレカ注文");
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentUpdated, error: err1 } = await supabase
    .from("orders")
    .select("id, payment_method, tracking_number, shipping_date, shipping_status, status, updated_at, created_at")
    .eq("payment_method", "credit_card")
    .gte("updated_at", sevenDaysAgo)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (err1) {
    console.error("Error:", err1.message);
  } else {
    console.log(`件数: ${recentUpdated?.length || 0}`);
    (recentUpdated || []).slice(0, 10).forEach((o, i) => {
      console.log(`  ${i+1}. updated: ${o.updated_at?.slice(0,19)} | status: ${o.status} | shipping: ${o.shipping_status || '-'} | tracking: ${o.tracking_number || '-'}`);
    });
  }

  // 2. shipping_status = "shipped" だが tracking_number が null のクレカ注文
  console.log("\n【2】shipping_status='shipped' だが tracking_number が null のクレカ注文");
  const { data: shippedNoTracking } = await supabase
    .from("orders")
    .select("id, payment_method, tracking_number, shipping_date, shipping_status, updated_at")
    .eq("payment_method", "credit_card")
    .eq("shipping_status", "shipped")
    .is("tracking_number", null)
    .limit(20);

  console.log(`件数: ${shippedNoTracking?.length || 0}`);
  if (shippedNoTracking?.length > 0) {
    shippedNoTracking.slice(0, 5).forEach((o, i) => {
      console.log(`  ${i+1}. id: ${o.id.slice(0,20)}... | shipping_date: ${o.shipping_date} | updated: ${o.updated_at?.slice(0,10)}`);
    });
  }

  // 3. 1月以降に作成されたクレカ注文の状況（全件）
  console.log("\n【3】2026年1月以降に作成されたクレカ注文のshipping情報");
  let allJanOrders = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("orders")
      .select("id, payment_method, tracking_number, shipping_date, shipping_status, status, created_at, updated_at")
      .eq("payment_method", "credit_card")
      .gte("created_at", "2026-01-01")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allJanOrders = allJanOrders.concat(data);
    offset += 1000;
  }

  console.log(`1月以降のクレカ注文総数: ${allJanOrders.length}`);

  const janWithTracking = allJanOrders.filter(o => o.tracking_number && o.tracking_number.trim() !== "");
  const janWithShippingDate = allJanOrders.filter(o => o.shipping_date);
  const janWithShippingStatus = allJanOrders.filter(o => o.shipping_status);
  const janConfirmed = allJanOrders.filter(o => o.status === "confirmed");

  console.log(`  tracking_number あり: ${janWithTracking.length}`);
  console.log(`  shipping_date あり: ${janWithShippingDate.length}`);
  console.log(`  shipping_status あり: ${janWithShippingStatus.length}`);
  console.log(`  status=confirmed: ${janConfirmed.length}`);

  if (janWithTracking.length > 0) {
    console.log("\n  追跡番号ありのサンプル:");
    janWithTracking.slice(0, 5).forEach((o, i) => {
      console.log(`    ${i+1}. ${o.tracking_number} | shipping_date: ${o.shipping_date} | created: ${o.created_at?.slice(0,10)}`);
    });
  }

  // 4. 全テーブルを確認 - tracking情報が別の場所にあるか？
  console.log("\n【4】テーブル構造確認 - shippingやtrackingを含むテーブル");

  // bank_transfer_ordersにtracking情報があるか確認
  const { data: btSample } = await supabase
    .from("bank_transfer_orders")
    .select("*")
    .limit(1);

  if (btSample && btSample.length > 0) {
    const cols = Object.keys(btSample[0]);
    const trackingCols = cols.filter(c => c.includes("tracking") || c.includes("shipping"));
    console.log(`bank_transfer_orders のshipping/tracking関連カラム: ${trackingCols.join(", ") || "なし"}`);
  }

  // 5. 直近発送対象だったはずの注文（confirmed, shipping_date=null, 1月以降）
  console.log("\n【5】発送待ち（confirmed, shipping_date=null）の1月以降クレカ注文");
  const pendingShipment = allJanOrders.filter(o =>
    o.status === "confirmed" && !o.shipping_date
  );
  console.log(`件数: ${pendingShipment.length}`);

  if (pendingShipment.length > 0) {
    console.log("サンプル（最新5件）:");
    pendingShipment.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    pendingShipment.slice(0, 5).forEach((o, i) => {
      console.log(`  ${i+1}. created: ${o.created_at?.slice(0,10)} | tracking: ${o.tracking_number || '-'} | shipping_status: ${o.shipping_status || '-'}`);
    });
  }

  // 6. 直近で発送済みになっているはずの注文（shipping_status="shipped"）
  console.log("\n【6】全期間でshipping_status='shipped'のクレカ注文");
  let allShipped = [];
  offset = 0;
  while (true) {
    const { data } = await supabase
      .from("orders")
      .select("id, payment_method, tracking_number, shipping_date, shipping_status, created_at")
      .eq("payment_method", "credit_card")
      .eq("shipping_status", "shipped")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allShipped = allShipped.concat(data);
    offset += 1000;
  }

  console.log(`総件数: ${allShipped.length}`);
  const shippedWithTracking = allShipped.filter(o => o.tracking_number && o.tracking_number.trim() !== "");
  console.log(`  うち追跡番号あり: ${shippedWithTracking.length}`);
  console.log(`  うち追跡番号なし: ${allShipped.length - shippedWithTracking.length}`);

  // shipping_dateの分布
  const shippingDateDist = {};
  allShipped.forEach(o => {
    const date = o.shipping_date || "null";
    shippingDateDist[date] = (shippingDateDist[date] || 0) + 1;
  });
  console.log("\n  shipping_dateの分布:");
  Object.entries(shippingDateDist)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 10)
    .forEach(([date, count]) => {
      console.log(`    ${date}: ${count}件`);
    });
}

main().catch(console.error);
