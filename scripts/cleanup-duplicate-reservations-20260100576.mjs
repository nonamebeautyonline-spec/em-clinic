// scripts/cleanup-duplicate-reservations-20260100576.mjs
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

async function cleanupDuplicates() {
  const patientId = "20260100576";

  console.log("=== 20260100576 の重複予約削除 ===\n");

  // 全予約を取得（最新順）
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  console.log(`現在の予約数: ${reservations.length} 件\n`);

  if (reservations.length <= 1) {
    console.log("重複なし");
    return;
  }

  // 最新1件を保持、それ以外を削除
  const toKeep = reservations[0];
  const toDelete = reservations.slice(1);

  console.log(`保持する予約: ${toKeep.reserve_id} (${toKeep.reserved_date})`);
  console.log(`削除する予約: ${toDelete.length} 件\n`);

  for (const res of toDelete) {
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("reserve_id", res.reserve_id);

    if (error) {
      console.log(`  ❌ ${res.reserve_id} 削除失敗:`, error.message);
    } else {
      console.log(`  ✅ ${res.reserve_id} 削除 (${res.reserved_date})`);
    }
  }

  // intakeテーブルを最新の予約で更新
  console.log(`\nintakeテーブルを更新: reserve_id=${toKeep.reserve_id}`);
  const { error: intakeError } = await supabase
    .from("intake")
    .update({
      reserve_id: toKeep.reserve_id,
      reserved_date: toKeep.reserved_date,
      reserved_time: toKeep.reserved_time,
      status: toKeep.status,
    })
    .eq("patient_id", patientId);

  if (intakeError) {
    console.log(`  ❌ intake更新失敗:`, intakeError.message);
  } else {
    console.log(`  ✅ intake更新成功`);
  }

  console.log("\n=== 完了 ===");
}

cleanupDuplicates();
