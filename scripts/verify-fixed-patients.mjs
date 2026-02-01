// scripts/verify-fixed-patients.mjs
// 修正された2人の患者のstatusを確認

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const targetPatients = ["20251200229", "20260100576"];

async function verify() {
  console.log("=== 修正された患者のstatus確認 ===\n");

  for (const patientId of targetPatients) {
    const { data: intake } = await supabase
      .from("intake")
      .select("patient_id, patient_name, reserved_date, reserved_time, status")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (!intake) {
      console.log(`❌ ${patientId}: データが見つかりません`);
      continue;
    }

    const statusDisplay = intake.status === null ? "NULL" :
                          intake.status === "" ? '""（空文字列）' :
                          `"${intake.status}"`;

    console.log(`${patientId} (${intake.patient_name})`);
    console.log(`  reserved_date: ${intake.reserved_date}`);
    console.log(`  reserved_time: ${intake.reserved_time}`);
    console.log(`  status: ${statusDisplay}`);

    if (intake.status === null) {
      console.log(`  ✅ 正常に修正されました - カルテの「未診」に表示されます\n`);
    } else {
      console.log(`  ❌ まだ status = ${statusDisplay} です\n`);
    }
  }

  // CHECK制約が追加されたか確認
  console.log("\n【CHECK制約の確認】");
  console.log("以下のクエリでCHECK制約を確認してください:");
  console.log("SELECT conname, pg_get_constraintdef(oid)");
  console.log("FROM pg_constraint");
  console.log("WHERE conrelid = 'intake'::regclass");
  console.log("AND conname = 'intake_status_check';");
  console.log("\n制約が追加されていれば、今後 status = 'pending' の混入は不可能です。");
}

verify();
