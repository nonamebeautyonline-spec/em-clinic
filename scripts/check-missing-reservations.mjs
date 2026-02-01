// scripts/check-missing-reservations.mjs
// 20251200228 と 20260101580 の予約データを確認

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
const gasReservationsUrl = envVars.GAS_RESERVATIONS_URL;
const adminToken = envVars.ADMIN_TOKEN;

const targetPatients = ["20251200228", "20260101580"];

async function check() {
  console.log("=== 予約データ確認 ===\n");

  for (const patientId of targetPatients) {
    console.log(`\n【patient_id: ${patientId}】\n`);

    // 1. Supabase reservationsテーブル
    console.log("1. Supabase reservationsテーブル:");
    const { data: reservations } = await supabase
      .from("reservations")
      .select("reserve_id, reserved_date, reserved_time, status, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (reservations && reservations.length > 0) {
      console.log(`   ✅ ${reservations.length} 件の予約あり`);
      reservations.forEach((r, idx) => {
        console.log(`   [${idx + 1}] ${r.reserve_id}`);
        console.log(`       date: ${r.reserved_date} ${r.reserved_time}`);
        console.log(`       status: ${r.status}`);
        console.log(`       created_at: ${r.created_at}`);
      });
    } else {
      console.log("   ❌ 予約なし");
    }

    // 2. Supabase intakeテーブル
    console.log("\n2. Supabase intakeテーブル:");
    const { data: intake } = await supabase
      .from("intake")
      .select("patient_id, patient_name, reserve_id, reserved_date, reserved_time, status, created_at")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (intake) {
      console.log(`   ✅ データあり`);
      console.log(`   patient_name: ${intake.patient_name || "NULL"}`);
      console.log(`   reserve_id: ${intake.reserve_id || "NULL"}`);
      console.log(`   reserved_date: ${intake.reserved_date || "NULL"}`);
      console.log(`   reserved_time: ${intake.reserved_time || "NULL"}`);
      console.log(`   status: ${intake.status || "NULL"}`);
      console.log(`   created_at: ${intake.created_at}`);
    } else {
      console.log("   ❌ データなし");
    }

    // 3. GAS予約シート
    console.log("\n3. GAS予約シート:");
    try {
      const gasResponse = await fetch(gasReservationsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "getAllReservations",
          token: adminToken,
        }),
      });

      if (!gasResponse.ok) {
        console.log(`   ❌ GAS API Error: ${gasResponse.status}`);
      } else {
        const gasData = await gasResponse.json();

        if (!gasData.ok || !Array.isArray(gasData.reservations)) {
          console.log("   ❌ GAS APIレスポンスが不正");
        } else {
          const gasReservations = gasData.reservations.filter(
            r => String(r.patient_id || "").trim() === patientId
          );

          if (gasReservations.length > 0) {
            console.log(`   ✅ ${gasReservations.length} 件の予約あり`);
            gasReservations.forEach((r, idx) => {
              console.log(`   [${idx + 1}] ${r.reserve_id}`);
              console.log(`       date: ${r.date} ${r.time}`);
              console.log(`       status: ${r.status || "なし"}`);
              console.log(`       timestamp: ${r.timestamp}`);
            });
          } else {
            console.log("   ❌ 予約なし");
          }
        }
      }
    } catch (e) {
      console.log(`   ❌ GAS取得エラー: ${e.message}`);
    }
  }

  console.log("\n\n【判定】");
  console.log("GASに予約があるのにSupabaseにない場合:");
  console.log("  → 予約作成時のSupabase書き込みが失敗した可能性");
  console.log("  → CHECK制約が原因でintakeテーブルの更新が失敗した可能性");
}

check();
