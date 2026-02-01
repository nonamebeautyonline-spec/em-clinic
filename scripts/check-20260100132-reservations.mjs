// scripts/check-20260100132-reservations.mjs
// 20260100132のreservationsテーブルの状況確認

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

async function check() {
  console.log("=== 20260100132のreservations確認 ===\n");

  const patientId = "20260100132";

  // 全予約を取得
  const { data: allReservations } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date, reserved_time, status, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  console.log(`総予約数: ${allReservations?.length || 0} 件\n`);

  if (allReservations && allReservations.length > 0) {
    allReservations.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.reserve_id}`);
      console.log(`   date: ${r.reserved_date}, time: ${r.reserved_time}`);
      console.log(`   status: ${r.status || 'null'}`);
      console.log(`   created: ${r.created_at}`);
      console.log();
    });
  }

  // 正しい予約ID
  const correctReserveId = "resv-1769673522720";
  const wrongReserveId = "resv-1769673647692";

  const correctExists = allReservations?.some(r => r.reserve_id === correctReserveId);
  const wrongExists = allReservations?.some(r => r.reserve_id === wrongReserveId);

  console.log(`\n【確認】`);
  console.log(`正しい予約 (${correctReserveId}): ${correctExists ? '✅ 存在する' : '❌ 削除されている'}`);
  console.log(`誤った予約 (${wrongReserveId}): ${wrongExists ? '⚠️ 存在する（削除必要）' : '✅ 削除済み'}`);

  if (!correctExists) {
    console.log(`\n❌ 正しい予約が削除されています！復元が必要です。`);
  }

  if (wrongExists) {
    console.log(`\n⚠️ 誤った予約が残っています。削除が必要です。`);
  }
}

check();
