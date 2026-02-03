import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cancelReservation() {
  const reserveId = "resv-1770084040110";
  const patientId = "20260200126";

  console.log("\n" + "=".repeat(70));
  console.log("予約キャンセル: " + patientId);
  console.log("予約ID: " + reserveId);
  console.log("=".repeat(70));

  try {
    // reservations tableを更新
    console.log("\n[1/1] reservationsテーブルを更新中...");
    const { data, error } = await supabase
      .from("reservations")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("reserve_id", reserveId)
      .select("*")
      .single();

    if (error) {
      console.error("❌ Error:", error);
      return;
    }

    console.log("✅ 更新成功");
    console.log("  患者名: " + data.patient_name);
    console.log("  予約日時: " + data.reserved_date + " " + data.reserved_time);
    console.log("  Status: " + data.status);

    console.log("\n" + "=".repeat(70));
    console.log("✅ 予約をキャンセルしました");
    console.log("=".repeat(70));

  } catch (err) {
    console.error("❌ エラー:", err.message);
  }
}

cancelReservation().catch(console.error);
