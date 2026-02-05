import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const GAS_RESERVATIONS_URL = envVars.GAS_RESERVATIONS_URL;
const ADMIN_TOKEN = envVars.ADMIN_TOKEN;

const targetDate = "2026-02-04";

async function main() {
  console.log("=== " + targetDate + " キャンセル同期確認 ===\n");

  console.log("[1/2] GASからキャンセル取得...");
  const gasResponse = await fetch(GAS_RESERVATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getAllReservations",
      date: targetDate,
      token: ADMIN_TOKEN,
    }),
  });

  const gasData = await gasResponse.json();
  if (!gasData.ok || !gasData.reservations) {
    console.error("GASエラー:", gasData);
    return;
  }

  const gasCanceled = gasData.reservations.filter(r => {
    const dateStr = r.date || r.reserved_date || "";
    const normalized = dateStr.replace(/\//g, "-");
    const isToday = normalized === targetDate || normalized.startsWith(targetDate);
    const status = r.status || "";
    const isCanceled = status === "キャンセル" || status.toLowerCase() === "canceled";
    return isToday && isCanceled;
  });

  console.log("  GASキャンセル(" + targetDate + "): " + gasCanceled.length + "件");

  console.log("[2/2] DBからキャンセル取得...");
  const { data: dbCanceled } = await supabase
    .from("reservations")
    .select("patient_id, patient_name, reserve_id, status")
    .eq("reserved_date", targetDate)
    .eq("status", "canceled");

  const dbCanceledCount = dbCanceled ? dbCanceled.length : 0;
  console.log("  DBキャンセル: " + dbCanceledCount + "件\n");

  const dbCanceledReserveIds = new Set((dbCanceled || []).map(r => r.reserve_id));

  const notSyncedCancels = gasCanceled.filter(r => {
    const reserveId = r.reserveId || r.reserve_id;
    return !dbCanceledReserveIds.has(reserveId);
  });

  console.log("============================================================");
  console.log("【GASでキャンセルだがDBに反映されていない予約】");
  console.log("============================================================");

  if (notSyncedCancels.length === 0) {
    console.log("\n✅ 同期漏れなし");
  } else {
    console.log("\n⚠️ " + notSyncedCancels.length + "件の同期漏れ:\n");
    for (const r of notSyncedCancels) {
      const pid = r.patientId || r.patient_id;
      const name = r.patientName || r.patient_name || "";
      const reserveId = r.reserveId || r.reserve_id;
      const time = r.time || r.reserved_time || r.reservedTime;
      console.log("患者ID: " + pid + " / " + name);
      console.log("  予約ID: " + reserveId);
      console.log("  時刻: " + time);
      console.log("  GAS status: " + r.status);

      const { data: dbRecord } = await supabase
        .from("reservations")
        .select("status")
        .eq("reserve_id", reserveId)
        .single();

      console.log("  DB status: " + (dbRecord ? dbRecord.status : "(レコードなし)"));
      console.log("------------------------------------------------------------");
    }
  }

  console.log("\n============================================================");
  console.log("集計:");
  console.log("  GASキャンセル: " + gasCanceled.length + "件");
  console.log("  DBキャンセル: " + dbCanceledCount + "件");
  console.log("  同期漏れ: " + notSyncedCancels.length + "件");
  console.log("============================================================");
}

main().catch(console.error);
