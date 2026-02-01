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

console.log("=== 日時不一致の修正 ===\n");

const patientId = "20251200514";
const reserveId = "resv-1769528382937";

console.log(`patient_id: ${patientId}`);
console.log(`正しい予約: 2026-01-30 18:15 (${reserveId})\n`);

const { error } = await supabase
  .from("intake")
  .update({
    reserved_date: "2026-01-30",
    reserved_time: "18:15:00",
  })
  .eq("patient_id", patientId)
  .eq("reserve_id", reserveId);

if (error) {
  console.error("❌ 更新エラー:", error);
} else {
  console.log("✓ Intakeテーブルの日時を修正しました");
}

console.log("\n=== 修正完了 ===");
