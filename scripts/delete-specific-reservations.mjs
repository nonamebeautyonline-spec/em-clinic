// scripts/delete-specific-reservations.mjs
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

async function deleteSpecific() {
  const toDelete = [
    "resv-1769679315937",
    "resv-1769679308384",
    "resv-1769679296560",
    "resv-1769679124741",
    "resv-1769679064895",
    "resv-1769678984179",
    "resv-1769678941927",
    "resv-1769678930781",
    "resv-1769678855708"
  ];

  console.log(`削除対象: ${toDelete.length} 件\n`);

  for (const reserveId of toDelete) {
    // 存在確認
    const { data: existing } = await supabase
      .from("reservations")
      .select("reserve_id, patient_id")
      .eq("reserve_id", reserveId)
      .maybeSingle();

    if (existing) {
      console.log(`${reserveId}: 存在 (patient_id: ${existing.patient_id})`);

      // 削除実行
      const { error, count } = await supabase
        .from("reservations")
        .delete({ count: "exact" })
        .eq("reserve_id", reserveId);

      if (error) {
        console.log(`  ❌ 削除失敗: ${error.message}`);
      } else {
        console.log(`  ✅ 削除成功 (削除件数: ${count})`);
      }
    } else {
      console.log(`${reserveId}: 存在しない`);
    }
  }

  // 最終確認
  console.log("\n最終確認:");
  const { data: final } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date")
    .eq("patient_id", "20260100576")
    .order("reserved_date", { ascending: true });

  console.log(`残り予約数: ${final?.length || 0} 件`);
  if (final) {
    final.forEach(r => {
      console.log(`  - ${r.reserve_id} (${r.reserved_date})`);
    });
  }
}

deleteSpecific();
