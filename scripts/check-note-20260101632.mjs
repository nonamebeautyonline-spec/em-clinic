// 20260101632のカルテノート確認
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

console.log("=== 20260101632 カルテノート確認 ===\n");

const { data, error } = await supabase
  .from("intake")
  .select("patient_id, patient_name, reserve_id, status, note, prescription_menu")
  .eq("patient_id", "20260101632")
  .single();

if (error) {
  console.error("エラー:", error.message);
} else {
  console.log("患者ID:", data.patient_id);
  console.log("患者名:", data.patient_name);
  console.log("予約ID:", data.reserve_id || "null");
  console.log("ステータス:", data.status || "null");
  console.log("処方メニュー:", data.prescription_menu || "null");
  console.log("\n【カルテノート】");
  console.log(data.note || "(記載なし)");
}

console.log("\n=== 確認完了 ===");
