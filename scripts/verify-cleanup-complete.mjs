// scripts/verify-cleanup-complete.mjs
// 整理した患者の最終確認

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

async function verifyCleanup() {
  console.log("=== 整理完了確認 ===\n");

  const cleanedPatients = [
    '20260101381',
    '20260100132',
    '20260101586',
    '20260100576',
    '20260101409',
    '20260101529'
  ];

  for (const patientId of cleanedPatients) {
    const { data: reservations } = await supabase
      .from("reservations")
      .select("reserve_id, reserved_date, status, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    const pendingCount = reservations?.filter(r => r.status === 'pending').length || 0;
    const canceledCount = reservations?.filter(r => r.status === 'canceled').length || 0;
    const totalCount = reservations?.length || 0;

    const status = pendingCount === 1 ? '✅' : '⚠️';
    console.log(`${status} patient_id: ${patientId}`);
    console.log(`   総予約: ${totalCount} 件 (pending: ${pendingCount}, canceled: ${canceledCount})`);

    if (reservations && reservations.length > 0) {
      const pendingReservations = reservations.filter(r => r.status === 'pending');
      if (pendingReservations.length > 0) {
        console.log(`   アクティブ予約: ${pendingReservations[0].reserve_id} (${pendingReservations[0].reserved_date})`);
      }
    }
    console.log();
  }

  console.log("=== 完了 ===");
}

verifyCleanup();
