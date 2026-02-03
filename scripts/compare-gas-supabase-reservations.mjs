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

async function compareReservations() {
  const today = "2026-02-03";

  console.log("\n" + "=".repeat(70));
  console.log("GASスプレッドシート vs Supabase 予約データ照合");
  console.log("=".repeat(70));

  // 1. GASから予約データを取得
  console.log("\n[1/2] GASスプレッドシートから予約取得中...");
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

  if (!gasData.ok || !gasData.reservations) {
    console.error("GASエラー:", gasData);
    return;
  }

  // キャンセル以外の予約のみ
  const gasReservations = gasData.reservations.filter(
    r => r.status !== 'キャンセル' && r.status !== 'canceled'
  );

  console.log(`  GAS有効予約: ${gasReservations.length}件`);

  // 2. Supabaseから予約データを取得
  console.log("\n[2/2] Supabase reservations取得中...");
  const { data: supabaseReservations } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, patient_name, reserved_time, status")
    .eq("reserved_date", today)
    .eq("status", "pending");

  console.log(`  Supabase pending予約: ${supabaseReservations?.length || 0}件`);

  // 3. reserve_idのセットを作成
  const gasReserveIds = new Set(
    gasReservations.map(r => r.reserveId || r.reserve_id)
  );

  const supabaseReserveIds = new Set(
    supabaseReservations?.map(r => r.reserve_id) || []
  );

  // 4. Supabaseにあるが、GASにない予約を検出
  console.log("\n" + "=".repeat(70));
  console.log("【Supabaseにあるが、GASスプレッドシートにない予約】");
  console.log("=".repeat(70));

  const extraInSupabase = supabaseReservations?.filter(
    r => !gasReserveIds.has(r.reserve_id)
  ) || [];

  if (extraInSupabase.length === 0) {
    console.log("\n✅ 差分なし。データは一致しています。");
  } else {
    console.log(`\n⚠️  ${extraInSupabase.length}件の予約がSupabaseに余分に存在:\n`);

    for (const record of extraInSupabase) {
      console.log(`患者ID: ${record.patient_id}`);
      console.log(`患者名: ${record.patient_name}`);
      console.log(`予約ID: ${record.reserve_id}`);
      console.log(`時刻: ${record.reserved_time}`);
      console.log(`status: ${record.status}`);
      console.log("-".repeat(70));
    }

    console.log("\n推奨対応:");
    console.log("- この予約をSupabaseからキャンセル済みに更新");
    console.log("- または、GASスプレッドシートに手動で追加");
  }

  // 5. GASにあるが、Supabaseにない予約も確認
  console.log("\n" + "=".repeat(70));
  console.log("【GASスプレッドシートにあるが、Supabaseにない予約】");
  console.log("=".repeat(70));

  const extraInGas = gasReservations.filter(
    r => !supabaseReserveIds.has(r.reserveId || r.reserve_id)
  );

  if (extraInGas.length === 0) {
    console.log("\n✅ 差分なし。");
  } else {
    console.log(`\n⚠️  ${extraInGas.length}件の予約がGASに余分に存在:\n`);

    for (const record of extraInGas) {
      console.log(`患者ID: ${record.patientId || record.patient_id}`);
      console.log(`患者名: ${record.patientName || record.patient_name}`);
      console.log(`予約ID: ${record.reserveId || record.reserve_id}`);
      console.log(`時刻: ${record.time || record.reserved_time}`);
      console.log("-".repeat(70));
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("集計:");
  console.log(`  GAS有効予約: ${gasReservations.length}件`);
  console.log(`  Supabase pending予約: ${supabaseReservations?.length || 0}件`);
  console.log(`  差: ${(supabaseReservations?.length || 0) - gasReservations.length}件`);
  console.log("=".repeat(70));
}

compareReservations().catch(console.error);
