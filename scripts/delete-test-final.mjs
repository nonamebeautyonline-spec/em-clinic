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
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== テストデータの最終削除 ===\n");

// idで削除
const { error } = await supabase
  .from("reservations")
  .delete()
  .eq("id", 2360);

if (error) {
  console.error("削除エラー:", error);
} else {
  console.log("✓ 削除成功");
  
  // 確認
  const { data: check } = await supabase
    .from("reservations")
    .select("*")
    .eq("reserve_id", "resv-1769698840247")
    .maybeSingle();
  
  if (check) {
    console.log("❌ まだ存在しています");
  } else {
    console.log("✓ 削除確認完了");
  }
}

console.log("\n=== 完了 ===");
