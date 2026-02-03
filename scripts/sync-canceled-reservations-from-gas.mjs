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

async function syncCanceledReservations() {
  const today = new Date().toISOString().split('T')[0];

  console.log("\nGASからキャンセル予約を同期: " + today);

  try {
    const { data: supabaseReservations } = await supabase
      .from("reservations")
      .select("id, reserve_id, patient_id, patient_name, reserved_time")
      .eq("reserved_date", today)
      .eq("status", "pending");

    const response = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "getAllReservations",
        date: today,
        token: ADMIN_TOKEN,
      }),
    });

    const data = await response.json();
    const gasActiveIds = new Set(
      data.reservations
        .filter(r => r.status !== 'キャンセル' && r.status !== 'canceled')
        .map(r => r.reserveId || r.reserve_id)
    );

    const shouldBeCanceled = supabaseReservations.filter(r => !gasActiveIds.has(r.reserve_id));

    console.log("キャンセル対象: " + shouldBeCanceled.length + "件");

    for (const resv of shouldBeCanceled) {
      await supabase.from("reservations").update({ status: "canceled" }).eq("id", resv.id);
      console.log("✅ " + resv.reserved_time + " " + resv.patient_name);
    }

  } catch (err) {
    console.error("エラー:", err.message);
  }
}

syncCanceledReservations().catch(console.error);
