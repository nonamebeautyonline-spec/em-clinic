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

async function checkMiyazaki() {
  const patientId = "20260200090";
  const reserveId = "resv-1770000776221";

  console.log("\n宮崎琴音の予約を確認:");
  console.log("=".repeat(70));

  // 1. intake
  const { data: intake } = await supabase
    .from("intake")
    .select("reserve_id, reserved_date, reserved_time")
    .eq("patient_id", patientId)
    .single();

  console.log("\nintake:");
  console.log("  reserve_id: " + intake.reserve_id);
  console.log("  reserved_date: " + intake.reserved_date);
  console.log("  reserved_time: " + intake.reserved_time);

  // 2. reservations
  const { data: reservation } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date, reserved_time, status")
    .eq("reserve_id", reserveId)
    .single();

  console.log("\nreservations:");
  console.log("  reserve_id: " + reservation.reserve_id);
  console.log("  reserved_date: " + reservation.reserved_date);
  console.log("  reserved_time: " + reservation.reserved_time);
  console.log("  status: " + reservation.status);

  // 3. GAS
  const response = await fetch(GAS_RESERVATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getAllReservations",
      date: "2026-02-04",
      token: ADMIN_TOKEN,
    }),
  });

  const data = await response.json();
  const gasReservation = data.reservations.find(r => 
    (r.reserveId || r.reserve_id) === reserveId
  );

  if (gasReservation) {
    console.log("\nGAS:");
    console.log("  reserve_id: " + (gasReservation.reserveId || gasReservation.reserve_id));
    console.log("  date: " + (gasReservation.date || gasReservation.reserved_date));
    console.log("  time: " + (gasReservation.time || gasReservation.reserved_time));
    console.log("  status: " + gasReservation.status);
  } else {
    console.log("\nGAS: 見つかりません");
  }

  console.log("\n" + "=".repeat(70));
  console.log("結論: reservationsの日付 (2026-02-04) が正しい");
  console.log("intakeの日付を修正します");
}

checkMiyazaki().catch(console.error);
