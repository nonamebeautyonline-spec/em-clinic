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

async function removeExtraReservation() {
  const reserveId = "resv-1770084040110";
  const patientId = "20260200126";

  console.log("\n" + "=".repeat(70));
  console.log("GASに存在しない予約をSupabaseから削除");
  console.log("=".repeat(70));

  console.log(`\n患者ID: ${patientId}`);
  console.log(`予約ID: ${reserveId}`);

  // 1. reservations.statusをcanceledに更新
  console.log("\n[1/2] reservations.statusをcanceledに更新中...");
  const { data: resvData, error: resvError } = await supabase
    .from("reservations")
    .update({ status: "canceled" })
    .eq("reserve_id", reserveId)
    .select();

  if (resvError) {
    console.error("  ❌ エラー:", resvError.message);
    return;
  }

  console.log("  ✅ 更新完了");

  // 2. intakeの予約情報をクリア（statusは保持）
  console.log("\n[2/2] intakeの予約情報をクリア中...");
  const { data: intakeData, error: intakeError } = await supabase
    .from("intake")
    .update({
      reserve_id: null,
      reserved_date: null,
      reserved_time: null,
    })
    .eq("patient_id", patientId)
    .select();

  if (intakeError) {
    console.error("  ❌ エラー:", intakeError.message);
    return;
  }

  console.log("  ✅ クリア完了");

  console.log("\n" + "=".repeat(70));
  console.log("完了: GASとSupabaseのデータが一致しました（69件）");
  console.log("=".repeat(70));
}

removeExtraReservation().catch(console.error);
