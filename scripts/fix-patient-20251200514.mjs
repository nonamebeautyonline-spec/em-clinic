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

console.log("=== patient_id: 20251200514 のreservationsテーブルを修正 ===\n");

const patientId = "20251200514";
const reserveId = "resv-1769528382937";

console.log("修正内容:");
console.log("  1/30 18:15 → 1/31 13:45\n");

const { error } = await supabase
  .from("reservations")
  .update({
    reserved_date: "2026-01-31",
    reserved_time: "13:45:00",
  })
  .eq("reserve_id", reserveId);

if (error) {
  console.error("❌ 更新エラー:", error);
} else {
  console.log("✓ Reservationsテーブル更新完了");

  // 確認
  const { data: check } = await supabase
    .from("reservations")
    .select("reserved_date, reserved_time")
    .eq("reserve_id", reserveId)
    .single();

  console.log("\n更新後の確認:");
  console.log("  reserved_date:", check.reserved_date);
  console.log("  reserved_time:", check.reserved_time);
}

console.log("\n=== 修正完了 ===");
