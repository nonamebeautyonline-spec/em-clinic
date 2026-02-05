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
  // 2026-02-03T21:27:50 に何が起きたか確認
  const targetTime = "2026-02-03T21:27:50";

  console.log("=== " + targetTime + " に更新された注文を確認 ===\n");

  // このタイムスタンプで更新された注文数を確認（±1秒の範囲）
  const { data } = await supabase
    .from("orders")
    .select("id, patient_id, payment_method, tracking_number, shipping_date, shipping_status, updated_at")
    .gte("updated_at", targetTime + ".000+00:00")
    .lte("updated_at", targetTime + ".999+00:00");

  console.log("この時刻に更新された注文数:", data?.length || 0);

  if (data && data.length > 0) {
    const withTracking = data.filter(o => o.tracking_number);
    const withoutTracking = data.filter(o => !o.tracking_number);
    console.log("  追跡番号あり:", withTracking.length);
    console.log("  追跡番号なし:", withoutTracking.length);

    const byCC = data.filter(o => o.payment_method === "credit_card");
    const byBT = data.filter(o => o.payment_method === "bank_transfer");
    console.log("  クレカ:", byCC.length);
    console.log("  銀行振込:", byBT.length);

    const byShipping = {};
    data.forEach(o => {
      const s = o.shipping_status || "null";
      byShipping[s] = (byShipping[s] || 0) + 1;
    });
    console.log("  shipping_status分布:", JSON.stringify(byShipping));
  }

  // より広い範囲で2026-02-03のupdated_atを確認
  console.log("\n=== 2026-02-03のupdated_atパターン分析 ===");

  const { data: feb3Updates } = await supabase
    .from("orders")
    .select("updated_at, payment_method, shipping_status, tracking_number")
    .gte("updated_at", "2026-02-03T00:00:00+00:00")
    .lte("updated_at", "2026-02-03T23:59:59+00:00")
    .eq("payment_method", "credit_card");

  if (feb3Updates && feb3Updates.length > 0) {
    console.log("2/3に更新されたクレカ注文:", feb3Updates.length);

    // 時間別に集計
    const byHour = {};
    feb3Updates.forEach(o => {
      const hour = o.updated_at.slice(11, 13);
      byHour[hour] = (byHour[hour] || 0) + 1;
    });
    console.log("時間別分布:", JSON.stringify(byHour));

    // 同じ秒に大量更新があったか確認
    const bySecond = {};
    feb3Updates.forEach(o => {
      const sec = o.updated_at.slice(0, 19);
      bySecond[sec] = (bySecond[sec] || 0) + 1;
    });

    const bulkUpdates = Object.entries(bySecond)
      .filter(([_, count]) => count > 5)
      .sort((a, b) => b[1] - a[1]);

    if (bulkUpdates.length > 0) {
      console.log("\n大量更新された時刻（5件以上）:");
      bulkUpdates.forEach(([time, count]) => {
        console.log("  " + time + ": " + count + "件");
      });
    }
  }

  // 12月に追跡番号があったクレカ注文の現在の状態
  console.log("\n=== 12月の追跡番号ありクレカ注文の現状 ===");

  const { data: decTracking } = await supabase
    .from("orders")
    .select("id, tracking_number, shipping_date, shipping_status, updated_at, created_at")
    .eq("payment_method", "credit_card")
    .not("tracking_number", "is", null)
    .neq("tracking_number", "")
    .gte("created_at", "2025-12-01")
    .lte("created_at", "2025-12-31")
    .limit(10);

  console.log("12月作成で追跡番号ありの件数:", decTracking?.length || 0);
  (decTracking || []).slice(0, 5).forEach((o, i) => {
    console.log("  " + (i+1) + ". created: " + o.created_at.slice(0,10) + " | tracking: " + o.tracking_number + " | updated: " + o.updated_at.slice(0,19));
  });
}

main().catch(console.error);
