// scripts/keep-resv-1769678855708.mjs
// resv-1769678855708のみ残して他を削除

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

const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SERVICE_ROLE_KEY;
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;

if (!serviceRoleKey) {
  console.error("❌ SERVICE_ROLE_KEY が見つかりません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function keepOnlyOne() {
  const patientId = "20260100576";
  const keepReserveId = "resv-1769678855708";

  console.log(`=== ${keepReserveId} のみ残して削除 ===\n`);

  // 削除
  const { error, count } = await supabase
    .from("reservations")
    .delete({ count: "exact" })
    .eq("patient_id", patientId)
    .neq("reserve_id", keepReserveId);

  if (error) {
    console.error(`❌ 削除失敗:`, error.message);
    process.exit(1);
  }

  console.log(`✅ 削除完了: ${count} 件\n`);

  // 保持した予約情報をintakeに反映
  const { data: kept } = await supabase
    .from("reservations")
    .select("*")
    .eq("reserve_id", keepReserveId)
    .maybeSingle();

  if (kept) {
    const { error: updateError } = await supabase
      .from("intake")
      .update({
        reserve_id: kept.reserve_id,
        reserved_date: kept.reserved_date,
        reserved_time: kept.reserved_time,
        status: kept.status,
      })
      .eq("patient_id", patientId);

    if (updateError) {
      console.error(`❌ intake更新失敗:`, updateError.message);
    } else {
      console.log(`✅ intake更新完了`);
      console.log(`   reserve_id: ${kept.reserve_id}`);
      console.log(`   reserved_date: ${kept.reserved_date}\n`);
    }
  }

  // 最終確認
  const { data: final } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date")
    .eq("patient_id", patientId);

  console.log("=== 最終確認 ===");
  console.log(`残り予約数: ${final?.length || 0} 件`);
  if (final) {
    final.forEach(r => {
      console.log(`  - ${r.reserve_id} (${r.reserved_date})`);
    });
  }
}

keepOnlyOne();
