import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

const GAS_URL = envVars.GAS_ADMIN_URL;
const targetDate = "2026-02-04";

console.log("=== GAS vs DB 予約比較 ===");
console.log("対象日: " + targetDate + "\n");

async function main() {
  // 1. Supabase DBから予約取得
  const { data: dbReservations, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("reserved_date", targetDate)
    .neq("status", "canceled")
    .order("reserved_time");

  if (error) {
    console.error("DB取得エラー:", error);
    return;
  }

  console.log("【DB予約】" + dbReservations.length + "件");

  // 2. GASから予約取得
  let gasReservations = [];
  try {
    const gasRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getReservations",
        startDate: targetDate,
        endDate: targetDate,
      }),
    });

    if (gasRes.ok) {
      const gasData = await gasRes.json();
      gasReservations = gasData.reservations || gasData.data || [];
    } else {
      console.error("GAS取得エラー:", gasRes.status);
    }
  } catch (err) {
    console.error("GAS fetch エラー:", err.message);
  }

  console.log("【GAS予約】" + gasReservations.length + "件\n");

  // 3. 比較 - patient_idをキーにする
  const dbPatientIds = new Set(dbReservations.map(r => String(r.patient_id)));
  const gasPatientIds = new Set(gasReservations.map(r => String(r.patient_id || r.patientId)));

  // DBにあってGASにない
  const onlyInDb = dbReservations.filter(r => !gasPatientIds.has(String(r.patient_id)));

  // GASにあってDBにない
  const onlyInGas = gasReservations.filter(r => !dbPatientIds.has(String(r.patient_id || r.patientId)));

  console.log("=== DBにのみ存在（" + onlyInDb.length + "件）===");
  onlyInDb.forEach(r => {
    console.log("  patient_id: " + r.patient_id + " / " + r.reserved_time + " / " + (r.patient_name || r.name || ""));
  });

  console.log("\n=== GASにのみ存在（" + onlyInGas.length + "件）===");
  onlyInGas.forEach(r => {
    const pid = r.patient_id || r.patientId;
    const time = r.reservation_time || r.reservationTime || r.time;
    const name = r.patient_name || r.patientName || r.name || "";
    console.log("  patient_id: " + pid + " / " + time + " / " + name);
  });

  // 詳細な比較（両方に存在するもので内容が違う場合）
  console.log("\n=== 両方に存在 ===");
  const bothIds = [...dbPatientIds].filter(id => gasPatientIds.has(id));
  console.log("共通: " + bothIds.length + "件");
}

main().catch(console.error);
