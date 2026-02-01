// scripts/fix-20260100132-from-gas.mjs
// 20260100132の正しい予約をGASから復元

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

const patientId = "20260100132";
const correctReserveId = "resv-1769673522720";
const wrongReserveId = "resv-1769673647692";

async function fix() {
  console.log("=== 20260100132の予約を修正 ===\n");

  // 1. GASから全予約データを取得
  console.log("1. GASから予約データ取得中...");
  const gasResponse = await fetch(gasReservationsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getAllReservations",
      token: adminToken,
    }),
  });

  if (!gasResponse.ok) {
    console.error(`❌ GAS API Error: ${gasResponse.status}`);
    return;
  }

  const gasData = await gasResponse.json();

  if (!gasData.ok || !Array.isArray(gasData.reservations)) {
    console.error("❌ GAS APIレスポンスが不正です:", gasData);
    return;
  }

  // 2. 正しい予約IDのデータを検索
  const correctReservation = gasData.reservations.find(
    r => r.reserve_id === correctReserveId && r.patient_id === patientId
  );

  if (!correctReservation) {
    console.error(`❌ GASに ${correctReserveId} が見つかりません`);
    return;
  }

  console.log(`   ✅ GASで正しい予約を発見\n`);
  console.log(`【GASデータ】`);
  console.log(`  reserve_id: ${correctReservation.reserve_id}`);
  console.log(`  patient_id: ${correctReservation.patient_id}`);
  console.log(`  name: ${correctReservation.name}`);
  console.log(`  date: ${correctReservation.date}`);
  console.log(`  time: ${correctReservation.time}`);
  console.log(`  status: ${correctReservation.status}`);

  // 3. intakeテーブルから患者名を取得
  const { data: intakeData } = await supabase
    .from("intake")
    .select("patient_name")
    .eq("patient_id", patientId)
    .maybeSingle();

  const patientName = intakeData?.patient_name || correctReservation.name || null;

  console.log(`\n2. Supabaseを修正中...`);

  // 4. 誤った予約を削除
  console.log(`   - 誤った予約を削除: ${wrongReserveId}`);
  const { error: deleteError } = await supabase
    .from("reservations")
    .delete()
    .eq("reserve_id", wrongReserveId);

  if (deleteError) {
    console.error(`   ❌ 削除失敗:`, deleteError.message);
    return;
  }
  console.log(`   ✅ 削除成功`);

  // 5. 正しい予約を挿入
  console.log(`   - 正しい予約を挿入: ${correctReserveId}`);
  const { error: insertError } = await supabase
    .from("reservations")
    .insert({
      reserve_id: correctReservation.reserve_id,
      patient_id: correctReservation.patient_id,
      patient_name: patientName,
      reserved_date: correctReservation.date || null,
      reserved_time: correctReservation.time || null,
      status: correctReservation.status === "キャンセル" ? "canceled" : "pending",
      note: null,
      prescription_menu: null,
    });

  if (insertError) {
    console.error(`   ❌ 挿入失敗:`, insertError.message);
    return;
  }
  console.log(`   ✅ 挿入成功`);

  // 6. intakeテーブルを更新
  console.log(`   - intakeテーブルを更新`);
  const { error: updateError } = await supabase
    .from("intake")
    .update({
      reserve_id: correctReservation.reserve_id,
      reserved_date: correctReservation.date || null,
      reserved_time: correctReservation.time || null,
    })
    .eq("patient_id", patientId);

  if (updateError) {
    console.error(`   ❌ 更新失敗:`, updateError.message);
    return;
  }
  console.log(`   ✅ 更新成功`);

  // 7. 最終確認
  console.log(`\n3. 最終確認...`);
  const { data: finalReservations } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date, reserved_time, status")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  const { data: finalIntake } = await supabase
    .from("intake")
    .select("reserve_id, reserved_date, reserved_time")
    .eq("patient_id", patientId)
    .maybeSingle();

  console.log(`\n【reservations】`);
  if (finalReservations && finalReservations.length > 0) {
    finalReservations.forEach(r => {
      console.log(`  ${r.reserve_id} (${r.reserved_date} ${r.reserved_time}) status: ${r.status}`);
    });
  }

  console.log(`\n【intake】`);
  if (finalIntake) {
    console.log(`  ${finalIntake.reserve_id} (${finalIntake.reserved_date} ${finalIntake.reserved_time})`);
  }

  console.log(`\n✅ 修正完了`);
}

fix();
