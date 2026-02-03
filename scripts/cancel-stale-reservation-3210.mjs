import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually
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

async function cancelStaleReservation() {
  const reservationId = 3210;
  const reserveId = "resv-1770084040110";
  const patientName = "尾花　萌";
  const patientId = "20260200126";

  console.log(`\n${"=".repeat(70)}`);
  console.log(`予約をキャンセル: ${patientName} (${patientId})`);
  console.log(`予約ID: ${reserveId}`);
  console.log(`DB ID: ${reservationId}`);
  console.log("=".repeat(70));

  try {
    // 1. 現在の状態を確認
    console.log("\n[1/2] 現在の状態を確認中...");

    const { data: before, error: beforeError } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .single();

    if (beforeError) {
      console.error(`❌ Error:`, beforeError);
      return;
    }

    console.log(`✅ 現在の状態:`);
    console.log(`   患者名: ${before.patient_name}`);
    console.log(`   予約日時: ${before.reserved_date} ${before.reserved_time}`);
    console.log(`   Status: ${before.status}`);
    console.log(`   更新日時: ${before.updated_at}`);

    if (before.status === 'canceled') {
      console.log(`\n⚠️  既にキャンセル済みです`);
      return;
    }

    // 2. statusをcanceledに更新
    console.log("\n[2/2] statusをcanceledに更新中...");

    const { data: updated, error: updateError } = await supabase
      .from("reservations")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservationId)
      .select("*")
      .single();

    if (updateError) {
      console.error(`❌ 更新エラー:`, updateError);
      return;
    }

    console.log(`✅ 更新成功`);
    console.log(`   患者名: ${updated.patient_name}`);
    console.log(`   予約日時: ${updated.reserved_date} ${updated.reserved_time}`);
    console.log(`   Status: ${updated.status}`);
    console.log(`   更新日時: ${updated.updated_at}`);

    console.log(`\n${"=".repeat(70)}`);
    console.log("✅ 予約のキャンセル処理が完了しました");
    console.log("=".repeat(70));

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
    console.error(err.stack);
  }
}

cancelStaleReservation().catch(console.error);
