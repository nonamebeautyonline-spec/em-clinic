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

async function check() {
  const today = "2026-02-03";

  console.log("\n" + "=".repeat(70));
  console.log("診察済みなのにreservations.status=pendingの予約を確認");
  console.log("=".repeat(70));

  // intake.status = 'OK' or 'NG' だが reservations.status = 'pending'
  const { data: intakeRecords } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, status")
    .eq("reserved_date", today)
    .not("status", "is", null)
    .not("reserve_id", "is", null);

  console.log(`\nintake で診察済み（OK/NG）: ${intakeRecords?.length || 0}件\n`);

  let mismatchCount = 0;

  for (const intake of intakeRecords || []) {
    const { data: resv } = await supabase
      .from("reservations")
      .select("status")
      .eq("reserve_id", intake.reserve_id)
      .single();

    if (resv && resv.status === "pending") {
      mismatchCount++;
      if (mismatchCount <= 10) {
        console.log(`${intake.patient_name} (${intake.patient_id})`);
        console.log(`  intake.status: ${intake.status}`);
        console.log(`  reservations.status: ${resv.status} ← 本来はcompletedであるべき`);
        console.log("");
      }
    }
  }

  if (mismatchCount > 10) {
    console.log(`... 他 ${mismatchCount - 10}件\n`);
  }

  console.log("=".repeat(70));
  console.log(`診察済みなのにreservations.status=pending: ${mismatchCount}件`);
  console.log("=".repeat(70));

  console.log("\n【問題点】");
  console.log("- 診察完了時に reservations.status を 'completed' に更新する処理がない");
  console.log("- /api/doctor/update で intake.status を更新する時に、");
  console.log("  同時に reservations.status も 'completed' にすべき");

  console.log("\n【修正方法】");
  console.log("1. /api/doctor/update を修正");
  console.log("2. 既存の診察済み予約のreservations.statusを一括更新");
}

check().catch(console.error);
