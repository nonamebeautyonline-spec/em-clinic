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
  const today = new Date().toISOString().split('T')[0];

  console.log("\n" + "=".repeat(70));
  console.log("GAS vs Supabase 予約比較: " + today);
  console.log("=".repeat(70));

  try {
    // 1. Supabaseから取得
    console.log("\n[1/2] Supabase pending予約を取得中...");
    const { data: supabaseReservations, error } = await supabase
      .from("reservations")
      .select("reserve_id, patient_id, patient_name, reserved_time, status")
      .eq("reserved_date", today)
      .eq("status", "pending")
      .order("reserved_time", { ascending: true });

    if (error) {
      console.error("❌ Supabase Error:", error);
      return;
    }

    console.log("✅ Supabase pending予約: " + supabaseReservations.length + "件");

    // 2. GASから取得
    console.log("\n[2/2] GAS予約を取得中...");
    const response = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "getAllReservations",
        date: today,
        token: ADMIN_TOKEN,
      }),
    });

    if (!response.ok) {
      console.error("❌ HTTP Error:", response.status);
      return;
    }

    const data = await response.json();
    if (!data.ok) {
      console.error("❌ API Error:", data.error);
      return;
    }

    const gasReservations = data.reservations.filter(r => 
      r.status !== 'キャンセル' && r.status !== 'canceled'
    );

    console.log("✅ GASアクティブ予約: " + gasReservations.length + "件");

    // 3. 比較
    console.log("\n" + "=".repeat(70));
    console.log("差分分析");
    console.log("=".repeat(70));

    const gasReserveIds = new Set(gasReservations.map(r => r.reserveId || r.reserve_id));
    const supabaseReserveIds = new Set(supabaseReservations.map(r => r.reserve_id));

    // SupabaseにあってGASにない（キャンセルされたはず）
    const shouldBeCanceled = supabaseReservations.filter(r => !gasReserveIds.has(r.reserve_id));

    // GASにあってSupabaseにない（同期漏れ）
    const missingInSupabase = gasReservations.filter(r => {
      const rid = r.reserveId || r.reserve_id;
      return !supabaseReserveIds.has(rid);
    });

    console.log("\n【SupabaseでpendingだがGASでキャンセル】: " + shouldBeCanceled.length + "件");
    if (shouldBeCanceled.length > 0) {
      shouldBeCanceled.forEach(r => {
        console.log("  - " + r.reserved_time + " " + r.patient_name + " (" + r.patient_id + ")");
        console.log("    予約ID: " + r.reserve_id);
      });
    }

    console.log("\n【GASにあるがSupabaseにない】: " + missingInSupabase.length + "件");
    if (missingInSupabase.length > 0) {
      missingInSupabase.forEach(r => {
        const rid = r.reserveId || r.reserve_id;
        const pid = r.patientId || r.patient_id;
        const name = r.name || r.patient_name;
        const time = r.time || r.reserved_time;
        console.log("  - " + time + " " + name + " (" + pid + ")");
        console.log("    予約ID: " + rid);
      });
    }

    console.log("\n" + "=".repeat(70));
    console.log("サマリー");
    console.log("=".repeat(70));
    console.log("Supabase pending: " + supabaseReservations.length + "件");
    console.log("GASアクティブ: " + gasReservations.length + "件");
    console.log("差分: " + (supabaseReservations.length - gasReservations.length) + "件");

  } catch (err) {
    console.error("❌ エラー:", err.message);
  }
}

compareReservations().catch(console.error);
