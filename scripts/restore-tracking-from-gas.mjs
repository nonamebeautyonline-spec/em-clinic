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

const GAS_URL = envVars.GAS_MYPAGE_URL || envVars.GAS_INTAKE_URL;

async function main() {
  console.log("=== GASから追跡番号を復旧 ===\n");

  if (!GAS_URL) {
    console.error("❌ GAS_MYPAGE_URL が設定されていません");
    return;
  }

  // 1. GASから全注文データを取得
  console.log("1. GASから注文データを取得中...");

  const response = await fetch(`${GAS_URL}?type=getAllOrders`, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    console.error("❌ GAS API呼び出し失敗:", response.status);
    return;
  }

  const data = await response.json();

  if (!data.ok) {
    console.error("❌ GASエラー:", data.error);
    return;
  }

  const orders = data.orders || [];
  console.log(`   取得件数: ${orders.length}件\n`);

  // 2. 追跡番号ありの注文を抽出
  const ordersWithTracking = orders.filter(o =>
    o.tracking_number && o.tracking_number.trim() !== ""
  );

  console.log(`2. 追跡番号ありの注文: ${ordersWithTracking.length}件\n`);

  if (ordersWithTracking.length === 0) {
    console.log("⚠️  GASに追跡番号データがありません");
    return;
  }

  // サンプル表示
  console.log("   サンプル（先頭5件）:");
  ordersWithTracking.slice(0, 5).forEach((o, i) => {
    console.log(`   ${i+1}. id: ${o.id?.slice(0, 20)}... | tracking: ${o.tracking_number} | shipping_date: ${o.shipping_date || '-'}`);
  });

  // 3. DBを更新（追跡番号を復旧）
  console.log("\n3. DBを更新中...\n");

  let updated = 0;
  let errors = 0;
  let skipped = 0;

  for (const order of ordersWithTracking) {
    if (!order.id) {
      skipped++;
      continue;
    }

    const updateData = {
      tracking_number: order.tracking_number,
      shipping_status: order.shipping_status || "shipped",
      shipping_date: order.shipping_date || null,
    };

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", order.id);

    if (error) {
      // 注文が存在しない可能性
      if (error.code === "PGRST116") {
        skipped++;
      } else {
        console.error(`   ❌ ${order.id}: ${error.message}`);
        errors++;
      }
    } else {
      updated++;
    }
  }

  console.log("\n=== 復旧完了 ===");
  console.log(`更新成功: ${updated}件`);
  console.log(`スキップ: ${skipped}件`);
  console.log(`エラー: ${errors}件`);

  // 4. 確認
  console.log("\n4. 復旧後の確認...");

  const { data: dbOrders } = await supabase
    .from("orders")
    .select("id, tracking_number, shipping_date, shipping_status, payment_method")
    .not("tracking_number", "is", null)
    .neq("tracking_number", "")
    .order("shipping_date", { ascending: false })
    .limit(20);

  console.log(`\n   追跡番号ありの注文（復旧後）: ${dbOrders?.length || 0}件`);

  if (dbOrders && dbOrders.length > 0) {
    const byMethod = {};
    dbOrders.forEach(o => {
      const m = o.payment_method || "unknown";
      byMethod[m] = (byMethod[m] || 0) + 1;
    });
    console.log(`   payment_method別: ${JSON.stringify(byMethod)}`);

    console.log("\n   最新10件:");
    dbOrders.slice(0, 10).forEach((o, i) => {
      console.log(`   ${i+1}. ${o.payment_method} | ${o.tracking_number} | ${o.shipping_date || '-'}`);
    });
  }
}

main().catch(console.error);
