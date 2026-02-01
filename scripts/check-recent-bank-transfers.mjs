// 最近の銀行振込データを確認（DB）
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
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== 銀行振込データ（DB） ===\n");

// 今日のデータ件数を確認
const today = "2026-01-30";
const { count, error: countError } = await supabase
  .from("bank_transfer_orders")
  .select("*", { count: "exact", head: true })
  .gte("submitted_at", today + "T00:00:00")
  .lte("submitted_at", today + "T23:59:59");

console.log(`今日(${today})のデータ件数: ${count}件\n`);

// bank_transfer_orders テーブルから今日のデータを全て取得
const { data, error } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .gte("submitted_at", today + "T00:00:00")
  .lte("submitted_at", today + "T23:59:59")
  .order("submitted_at", { ascending: false });

if (error) {
  console.error("エラー:", error.message);
  process.exit(1);
}

console.log(`今日のデータ一覧:\n`);

if (data.length === 0) {
  console.log("データがありません");
} else {
  for (const row of data) {
    console.log(`order_id: ${row.order_id}`);
    console.log(`  patient_id: ${row.patient_id}`);
    console.log(`  product_code: ${row.product_code}`);
    console.log(`  account_name: ${row.account_name}`);
    console.log(`  status: ${row.status}`);
    console.log(`  submitted_at: ${row.submitted_at}`);
    console.log(`  created_at: ${row.created_at}`);
    console.log();
  }
}

console.log("=== 確認完了 ===");
