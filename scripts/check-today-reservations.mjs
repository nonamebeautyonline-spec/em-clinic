// scripts/check-today-reservations.mjs
// 今日(2026-01-30)の予約をSupabaseから取得して分析

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

async function checkTodayReservations() {
  const targetDate = "2026-01-30";
  console.log("=== " + targetDate + " の予約分析 ===\n");

  // 今日の予約を全て取得
  const { data: todayReservations, error } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, reserved_date, status, created_at, updated_at")
    .eq("reserved_date", targetDate)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("エラー:", error.message);
    return;
  }

  if (!todayReservations || todayReservations.length === 0) {
    console.log(targetDate + " の予約はありません");
    return;
  }

  // 1. 今日の予約件数
  console.log("【1. 今日の予約件数】");
  console.log("   合計: " + todayReservations.length + " 件\n");

  // 2. ステータス別の件数
  console.log("【2. ステータス別の件数】");
  const statusCounts = {};
  for (const res of todayReservations) {
    const status = res.status || "null";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  for (const [status, count] of Object.entries(statusCounts).sort()) {
    console.log("   " + status + ": " + count + " 件");
  }
  console.log();

  // 3. 患者IDの重複チェック
  console.log("【3. 患者IDの重複チェック】");
  const patientGroups = {};
  for (const res of todayReservations) {
    if (!patientGroups[res.patient_id]) {
      patientGroups[res.patient_id] = [];
    }
    patientGroups[res.patient_id].push(res);
  }

  const duplicates = [];
  const uniquePatients = Object.keys(patientGroups).length;
  
  for (const [patientId, reservations] of Object.entries(patientGroups)) {
    if (reservations.length > 1) {
      duplicates.push({
        patient_id: patientId,
        count: reservations.length,
        reservations,
      });
    }
  }

  console.log("   ユニークな患者数: " + uniquePatients + " 人");
  
  if (duplicates.length === 0) {
    console.log("   重複なし（各患者1件のみ）\n");
  } else {
    console.log("   重複あり: " + duplicates.length + " 人が複数予約を持っています\n");
    
    for (const dup of duplicates) {
      console.log("   patient_id: " + dup.patient_id + " - " + dup.count + " 件の予約");
      dup.reservations.forEach((r, i) => {
        console.log("     " + (i + 1) + ". " + r.reserve_id + " [" + r.status + "] created: " + r.created_at);
      });
      console.log();
    }
  }

  // 詳細データ一覧
  console.log("【詳細データ一覧】");
  console.log("   予約ID | 患者ID | ステータス | 作成日時");
  console.log("   ======================================================================");
  todayReservations.forEach((r) => {
    console.log("   " + r.reserve_id + " | " + r.patient_id + " | " + r.status + " | " + r.created_at);
  });

  console.log("\n=== 分析完了 ===");
}

checkTodayReservations();
