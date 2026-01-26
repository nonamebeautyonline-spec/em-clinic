// のなめマスター（注文+配送情報）をSupabaseに一括同期するスクリプト
// 使い方: npx tsx scripts/sync-orders-to-supabase.ts

import { readFileSync } from "fs";
import { resolve } from "path";

// .env.localを手動でパース
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

type OrderRecord = {
  id: string; // payment_id
  patient_id: string;
  product_code: string | null;
  product_name: string | null;
  amount: number;
  paid_at: string | null; // ISO 8601 timestamp
  shipping_status: string;
  shipping_date: string | null;
  tracking_number: string | null;
  carrier: string | null;
  payment_status: string;
  refund_status: string | null;
  refunded_at: string | null;
  refunded_amount: number | null;
};

function parseJstDateTime(jstStr: string): string | null {
  if (!jstStr) return null;

  // "YYYY/MM/DD HH:MM:SS" を ISO 8601 に変換
  const match = jstStr.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [_, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
}

async function main() {
  console.log("=== Starting orders data sync ===");

  // 1. GASから注文データを取得
  console.log("Fetching orders data from GAS...");

  const gasUrl = envVars.GAS_MYPAGE_URL || envVars.GAS_INTAKE_URL;
  if (!gasUrl) {
    throw new Error("GAS_MYPAGE_URL or GAS_INTAKE_URL not set");
  }

  const response = await fetch(`${gasUrl}?type=getAllOrders`, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GAS fetch failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  console.log("GAS response:", JSON.stringify(data, null, 2));

  if (!data.ok) {
    throw new Error(`GAS returned error: ${data.error || "unknown"}`);
  }

  const rawOrders = data.orders || [];
  console.log(`Fetched ${rawOrders.length} orders from GAS`);

  // 2. データを変換（paid_at を ISO 8601 に変換）
  const orders: OrderRecord[] = rawOrders.map((order: any) => ({
    id: order.id,
    patient_id: order.patient_id,
    product_code: order.product_code || null,
    product_name: order.product_name || null,
    amount: order.amount || 0,
    paid_at: parseJstDateTime(order.paid_at) || null,
    shipping_status: order.shipping_status || "pending",
    shipping_date: order.shipping_date || null,
    tracking_number: order.tracking_number || null,
    carrier: order.carrier || null,
    payment_status: order.payment_status || "paid",
    refund_status: order.refund_status || null,
    refunded_at: parseJstDateTime(order.refunded_at) || null,
    refunded_amount: order.refunded_amount || null,
  }));

  console.log(`Fetched ${orders.length} orders from GAS`);

  // 2. Supabaseの既存データを全削除
  console.log("Deleting existing Supabase orders data...");
  const deleteResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=neq.___DUMMY___`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  if (!deleteResponse.ok) {
    throw new Error(`Delete failed: ${deleteResponse.status}`);
  }

  console.log("Existing orders data deleted");

  // 3. 新しいデータを一括挿入
  console.log("Inserting new orders data into Supabase...");

  const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(orders),
  });

  if (!insertResponse.ok) {
    const errorText = await insertResponse.text();
    throw new Error(`Insert failed: ${insertResponse.status} - ${errorText}`);
  }

  console.log(`✅ Successfully synced ${orders.length} orders to Supabase`);
}

main().catch((err) => {
  console.error("❌ Sync failed:", err);
  process.exit(1);
});
