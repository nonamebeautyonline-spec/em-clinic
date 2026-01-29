// scripts/cleanup-invalid-reservations.mjs
// 予約を取っていない患者の誤ったデータを削除

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

async function cleanupInvalidReservations() {
  console.log("=== 誤った予約データのクリーンアップ ===\n");

  const invalidPatients = [
    { patient_id: "20260101430", name: "阿部真由美" },
    { patient_id: "20260100253", name: "永井マミ" },
    { patient_id: "20260101355", name: "太木 奈菜" },
    { patient_id: "20260101538", name: "名古路　美樹" },
    { patient_id: "20260101457", name: "石澤" },
    { patient_id: "20260101580", name: "遠藤咲" }
  ];

  for (const patient of invalidPatients) {
    console.log(`--- ${patient.patient_id} (${patient.name}) ---`);

    // 1. reservations削除
    const { count: resCount } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("patient_id", patient.patient_id);

    if (resCount > 0) {
      const { error: resError } = await supabase
        .from("reservations")
        .delete()
        .eq("patient_id", patient.patient_id);

      if (resError) {
        console.log(`  ❌ reservations削除失敗:`, resError.message);
      } else {
        console.log(`  ✅ reservations削除: ${resCount} 件`);
      }
    } else {
      console.log(`  - reservations: データなし`);
    }

    // 2. intake削除
    const { count: intakeCount } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true })
      .eq("patient_id", patient.patient_id);

    if (intakeCount > 0) {
      const { error: intakeError } = await supabase
        .from("intake")
        .delete()
        .eq("patient_id", patient.patient_id);

      if (intakeError) {
        console.log(`  ❌ intake削除失敗:`, intakeError.message);
      } else {
        console.log(`  ✅ intake削除: ${intakeCount} 件`);
      }
    } else {
      console.log(`  - intake: データなし`);
    }

    // 3. answerers削除
    const { data: answerer } = await supabase
      .from("answerers")
      .select("*")
      .eq("patient_id", patient.patient_id)
      .maybeSingle();

    if (answerer) {
      const { error: answererError } = await supabase
        .from("answerers")
        .delete()
        .eq("patient_id", patient.patient_id);

      if (answererError) {
        console.log(`  ❌ answerers削除失敗:`, answererError.message);
      } else {
        console.log(`  ✅ answerers削除: 1 件`);
      }
    } else {
      console.log(`  - answerers: データなし`);
    }

    console.log("");
  }

  console.log("=== クリーンアップ完了 ===");

  // 最終確認
  const { count: finalResCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true });

  const { count: finalIntakeCount } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true });

  const { count: finalAnswererCount } = await supabase
    .from("answerers")
    .select("*", { count: "exact", head: true });

  console.log("\n最終レコード数:");
  console.log(`  reservations: ${finalResCount} 件`);
  console.log(`  intake: ${finalIntakeCount} 件`);
  console.log(`  answerers: ${finalAnswererCount} 件`);
}

cleanupInvalidReservations();
