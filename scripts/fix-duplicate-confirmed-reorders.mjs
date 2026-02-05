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
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 全てのconfirmed reordersを取得
  const { data: confirmedReorders, error } = await supabase
    .from("reorders")
    .select("*")
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`=== Confirmed Reorders: ${confirmedReorders.length}件 ===\n`);

  // patient_idごとにグループ化
  const byPatient = {};
  for (const r of confirmedReorders) {
    if (!byPatient[r.patient_id]) {
      byPatient[r.patient_id] = [];
    }
    byPatient[r.patient_id].push(r);
  }

  // 重複があるpatientを抽出
  const duplicates = Object.entries(byPatient).filter(([_, reorders]) => reorders.length > 1);

  if (duplicates.length === 0) {
    console.log("✅ 重複なし - confirmedが複数ある患者はいません");
    return;
  }

  console.log(`⚠️  confirmedが重複している患者: ${duplicates.length}人\n`);

  const toCancel = [];

  for (const [patientId, reorders] of duplicates) {
    console.log(`\n--- Patient: ${patientId} (confirmed ${reorders.length}件) ---`);

    // created_atで降順ソート（最新が先頭）
    reorders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    for (let i = 0; i < reorders.length; i++) {
      const r = reorders[i];
      const keep = i === 0; // 最新のみ残す
      console.log(`  ${keep ? "✅ KEEP" : "❌ CANCEL"} id:${r.id} created:${r.created_at?.slice(0,19)} product:${r.product_code}`);

      if (!keep) {
        toCancel.push(r.id);
      }
    }
  }

  console.log(`\n=== 修正対象: ${toCancel.length}件を canceled に変更 ===`);
  console.log("IDs:", toCancel);

  // 実際に修正
  if (toCancel.length > 0) {
    const { error: updateErr } = await supabase
      .from("reorders")
      .update({ status: "canceled" })
      .in("id", toCancel);

    if (updateErr) {
      console.error("Update error:", updateErr);
      return;
    }

    console.log("\n✅ 完了: 古いconfirmedをcanceledに変更しました");
  }
}

main();
