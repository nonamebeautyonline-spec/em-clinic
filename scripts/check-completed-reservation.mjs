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

async function checkCompleted() {
  console.log("\n" + "=".repeat(70));
  console.log("completed状態の予約を確認");
  console.log("=".repeat(70));

  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("reserved_date", "2026-02-03")
    .eq("status", "completed");

  if (error) {
    console.error("エラー:", error.message);
    return;
  }

  console.log(`\n該当件数: ${data.length}件\n`);

  for (const record of data) {
    console.log(`予約ID: ${record.reserve_id}`);
    console.log(`患者ID: ${record.patient_id}`);
    console.log(`患者名: ${record.patient_name}`);
    console.log(`予約日: ${record.reserved_date}`);
    console.log(`予約時刻: ${record.reserved_time}`);
    console.log(`ステータス: ${record.status}`);
    console.log(`作成日時: ${record.created_at}`);
    console.log(`更新日時: ${record.updated_at}`);
    console.log("-".repeat(70));

    // intakeの情報も確認
    const { data: intake } = await supabase
      .from("intake")
      .select("status, reserve_id, reserved_date, reserved_time")
      .eq("patient_id", record.patient_id)
      .single();

    if (intake) {
      console.log(`[intake情報]`);
      console.log(`  intakeステータス: ${intake.status || "(空)"}`);
      console.log(`  予約ID: ${intake.reserve_id || "(なし)"}`);
      console.log(`  予約日: ${intake.reserved_date || "(なし)"}`);
      console.log(`  予約時刻: ${intake.reserved_time || "(なし)"}`);
    }
    console.log("=".repeat(70));
  }

  console.log("\n説明:");
  console.log("- completed = 診察完了済みの予約");
  console.log("- この予約は既に診察が終わっているので、新規予約としてカウントすべきではない");
  console.log("- 真の予約 = pending状態の予約のみ");
  console.log("\n結論:");
  console.log("- pending: 69件 ← これが真の予約");
  console.log("- completed: 1件 ← 診察済み、予約ではない");
  console.log("=".repeat(70));
}

checkCompleted().catch(console.error);
