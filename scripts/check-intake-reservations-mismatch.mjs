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

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function checkMismatch() {
  const today = "2026-02-03";

  console.log("\n" + "=".repeat(70));
  console.log(`本日（${today}）の予約データ照合`);
  console.log("=".repeat(70));

  // 1. GASから予約データを取得
  console.log("\n[1/3] GAS予約データ取得中...");
  const gasResponse = await fetch(GAS_RESERVATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getAllReservations",
      date: today,
      token: ADMIN_TOKEN,
    }),
  });
  const gasData = await gasResponse.json();
  const gasReservations = gasData.reservations.filter(
    r => r.status !== 'キャンセル' && r.status !== 'canceled'
  );
  console.log(`  GAS有効予約: ${gasReservations.length}件`);

  // 2. reservations tableから取得
  console.log("\n[2/3] Supabase reservations取得中...");
  const { data: supabaseReservations } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, patient_name, reserved_time, status")
    .eq("reserved_date", today)
    .neq("status", "canceled");
  console.log(`  Supabase reservations（キャンセル除外）: ${supabaseReservations?.length || 0}件`);

  // 3. intake tableから予約情報を持っているレコードを取得
  console.log("\n[3/3] Supabase intake取得中...");
  const { data: intakeRecords } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, reserved_date, reserved_time, status")
    .eq("reserved_date", today)
    .not("reserve_id", "is", null);
  console.log(`  Supabase intake（予約情報あり）: ${intakeRecords?.length || 0}件`);

  // 4. GASのreserve_idをSetに
  const gasReserveIds = new Set(
    gasReservations.map(r => r.reserveId || r.reserve_id)
  );

  // 5. intakeの中でGASに存在しない予約を探す
  console.log("\n" + "=".repeat(70));
  console.log("【問題のある予約】");
  console.log("=".repeat(70));

  const problematic = intakeRecords.filter(
    record => !gasReserveIds.has(record.reserve_id)
  );

  if (problematic.length === 0) {
    console.log("\n✅ 問題なし。すべてのintake予約がGASに存在します。");
  } else {
    console.log(`\n⚠️  ${problematic.length}件の予約がintakeにあるがGASに存在しません:\n`);

    for (const record of problematic) {
      console.log(`患者ID: ${record.patient_id}`);
      console.log(`患者名: ${record.patient_name}`);
      console.log(`予約ID: ${record.reserve_id}`);
      console.log(`予約時刻: ${record.reserved_time}`);
      console.log(`intakeステータス: ${record.status || "(空)"}`);

      // reservations tableで確認
      const { data: resvCheck } = await supabase
        .from("reservations")
        .select("status")
        .eq("reserve_id", record.reserve_id)
        .single();

      if (resvCheck) {
        console.log(`reservationsステータス: ${resvCheck.status}`);
      } else {
        console.log(`reservationsステータス: (レコードなし)`);
      }

      console.log("-".repeat(70));
    }

    console.log("\n推奨対応:");
    console.log("- キャンセル済み → intakeの予約情報をクリア");
    console.log("- 完了済み → そのまま保持（OK/NGステータスと紐付け）");
  }

  console.log("\n" + "=".repeat(70));
  console.log("集計:");
  console.log(`  GAS有効予約: ${gasReservations.length}件`);
  console.log(`  Supabase reservations（キャンセル除外）: ${supabaseReservations?.length || 0}件`);
  console.log(`  Supabase intake（予約情報あり）: ${intakeRecords?.length || 0}件`);
  console.log("=".repeat(70));
}

checkMismatch().catch(console.error);
