// DBとGASシートの銀行振込データを比較
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

console.log("=== 銀行振込データ比較（DB vs GASシート） ===\n");

// 今日のデータをDBから取得
const today = "2026-01-30";
const { data: dbData, error } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .gte("submitted_at", today + "T00:00:00")
  .lte("submitted_at", today + "T23:59:59")
  .order("submitted_at", { ascending: true });

if (error) {
  console.error("エラー:", error.message);
  process.exit(1);
}

console.log(`【DB】今日のデータ件数: ${dbData.length}件\n`);

// テストデータを除外
const realData = dbData.filter(row => {
  const pid = String(row.patient_id || "");
  return !pid.startsWith("TEST_");
});

console.log(`【DB】実データ件数: ${realData.length}件\n`);
console.log("実データ一覧:\n");

for (const row of realData) {
  console.log(`${row.id}. ${row.patient_id} - ${row.account_name} (${row.product_code})`);
  console.log(`   submitted_at: ${row.submitted_at}`);
}

console.log("\n\n=== 次のステップ ===");
console.log("1. GASの銀行振込管理スプレッドシートを開く");
console.log("2. 「2026-01 住所情報」シートの内容を確認");
console.log("3. 上記のpatient_idと照合し、GASシートにないデータを特定");
console.log("\nGASシートの内容確認用関数を追加します...");
