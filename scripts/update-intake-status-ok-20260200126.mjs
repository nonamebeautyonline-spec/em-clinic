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

async function updateIntakeStatus() {
  const patientId = "20260200126";

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Intake status を OK に更新: ${patientId}`);
  console.log("=".repeat(70));

  try {
    // 1. 現在の状態を確認
    console.log("\n[1/2] 現在の状態を確認中...");

    const { data: before, error: beforeError } = await supabase
      .from("intake")
      .select("*")
      .eq("patient_id", patientId)
      .single();

    if (beforeError) {
      console.error(`❌ Error:`, beforeError);
      return;
    }

    console.log(`✅ 現在の状態:`);
    console.log(`   患者名: ${before.patient_name}`);
    console.log(`   予約日時: ${before.reserved_date} ${before.reserved_time}`);
    console.log(`   Status: ${before.status || "(なし)"}`);
    console.log(`   Note: ${before.note || "(なし)"}`);
    console.log(`   Prescription Menu: ${before.prescription_menu || "(なし)"}`);

    if (before.status === 'OK') {
      console.log(`\n⚠️  既にOKです`);
      return;
    }

    // 2. statusをOKに更新
    console.log("\n[2/2] statusをOKに更新中...");

    const { data: updated, error: updateError } = await supabase
      .from("intake")
      .update({
        status: "OK",
        updated_at: new Date().toISOString(),
      })
      .eq("patient_id", patientId)
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
    console.log("✅ Intake status を OK に更新しました");
    console.log("これでマイページから購入に進めるはずです");
    console.log("=".repeat(70));

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
    console.error(err.stack);
  }
}

updateIntakeStatus().catch(console.error);
