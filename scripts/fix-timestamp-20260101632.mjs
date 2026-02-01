// 20260101632 の timestamp を元に戻す（A列から名前を削除）
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

console.log("=== 20260101632 の created_at 取得 ===\n");

// DBから正しいcreated_atを取得
const { data, error } = await supabase
  .from("intake")
  .select("created_at, patient_name")
  .eq("patient_id", "20260101632")
  .single();

if (error) {
  console.error("エラー:", error.message);
  process.exit(1);
}

console.log("DB の created_at:", data.created_at);
console.log("DB の patient_name:", data.patient_name);
console.log("\n次のステップ:");
console.log("1. GASエディタで fix20260101632Timestamp 関数を実行");
console.log("2. この timestamp を GAS 問診シートの A列に設定してください:");
console.log("\n   " + data.created_at);
