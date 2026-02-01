// scripts/reconcile-gas-db-fixed.mjs
// 2026-01-30の予約についてGASシートとDBを完全に照合（フィールド名修正版）

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
const gasIntakeListUrl = envVars.GAS_INTAKE_LIST_URL;

async function reconcileGasDb() {
  const targetDate = "2026-01-30";
  console.log("==========================================================");
  console.log("  2026-01-30 予約データ照合レポート（修正版）");
  console.log("  GASシート（正） vs Supabase DB");
  console.log("==========================================================\n");

  // 1. GASシートから2026-01-30の予約を取得
  console.log("【1. GASシートからデータ取得中】");
  const response = await fetch(gasIntakeListUrl + "?from=" + targetDate + "&to=" + targetDate, {
    method: "GET",
  });

  if (!response.ok) {
    console.error("GASシートからのデータ取得に失敗:", response.statusText);
    return;
  }

  const gasData = await response.json();
  
  // 予約を持っているレコード（reserved_dateがnullでない）
  const gasReservations = gasData.filter(r => {
    const date = r.reserved_date || r.予約日;
    return date && date !== "";
  });

  console.log("   GASシート予約件数: " + gasReservations.length + " 件\n");

  // GASデータを reserve_id でマッピング（正しいフィールド名を使用）
  const gasByReserveId = new Map();
  const gasByPatientId = new Map();
  
  for (const gas of gasReservations) {
    const reserveId = gas.reserveId || gas.reserved;
    const patientId = gas.patient_id;
    const reservedTime = gas.reserved_time;
    const status = gas.status;
    
    gasByReserveId.set(reserveId, {
      reserve_id: reserveId,
      patient_id: patientId,
      reserved_time: reservedTime,
      status: status,
      name: gas.name,
      raw: gas
    });
    
    if (!gasByPatientId.has(patientId)) {
      gasByPatientId.set(patientId, []);
    }
    gasByPatientId.get(patientId).push({
      reserve_id: reserveId,
      reserved_time: reservedTime,
      status: status,
      name: gas.name
    });
  }

  // 2. Supabaseから2026-01-30の予約を取得
  console.log("【2. Supabaseからデータ取得中】");
  const { data: dbReservations, error } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, reserved_date, reserved_time, status, created_at, updated_at")
    .eq("reserved_date", targetDate)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabaseからのデータ取得に失敗:", error.message);
    return;
  }

  console.log("   Supabase予約件数: " + dbReservations.length + " 件");
  
  // pendingのみ
  const dbPendingReservations = dbReservations.filter(r => r.status === "pending");
  console.log("   - pending: " + dbPendingReservations.length + " 件");
  console.log("   - canceled: " + (dbReservations.length - dbPendingReservations.length) + " 件\n");

  // DBデータをマッピング
  const dbByReserveId = new Map();
  const dbByPatientId = new Map();
  
  for (const db of dbPendingReservations) {
    dbByReserveId.set(db.reserve_id, db);
    
    if (!dbByPatientId.has(db.patient_id)) {
      dbByPatientId.set(db.patient_id, []);
    }
    dbByPatientId.get(db.patient_id).push({
      reserve_id: db.reserve_id,
      reserved_time: db.reserved_time,
      status: db.status
    });
  }

  // 3. 照合分析
  console.log("==========================================================");
  console.log("【3. 照合結果（GAS vs DB pending予約のみ）】");
  console.log("==========================================================\n");

  // 3-1. reserve_idで照合
  console.log("【3-1. reserve_id ベース照合】");
  
  const onlyInGas = [];
  const onlyInDb = [];
  const inBoth = [];
  
  for (const [reserveId, gasRecord] of gasByReserveId) {
    if (dbByReserveId.has(reserveId)) {
      inBoth.push({
        reserve_id: reserveId,
        gas: gasRecord,
        db: dbByReserveId.get(reserveId)
      });
    } else {
      onlyInGas.push(gasRecord);
    }
  }
  
  for (const [reserveId, dbRecord] of dbByReserveId) {
    if (!gasByReserveId.has(reserveId)) {
      onlyInDb.push(dbRecord);
    }
  }

  console.log("   両方に存在: " + inBoth.length + " 件");
  console.log("   GASのみ（同期漏れ）: " + onlyInGas.length + " 件");
  console.log("   DBのみ（不正データ）: " + onlyInDb.length + " 件\n");

  // 3-2. GASにのみ存在する予約
  if (onlyInGas.length > 0) {
    console.log("==========================================================");
    console.log("【★ GASにあってDBにない予約（同期漏れ）★】");
    console.log("==========================================================");
    onlyInGas.forEach((gas, i) => {
      console.log("\n" + (i + 1) + ". reserve_id: " + gas.reserve_id);
      console.log("   patient_id: " + gas.patient_id);
      console.log("   name: " + gas.name);
      console.log("   reserved_time: " + gas.reserved_time);
      console.log("   status: " + (gas.status || "(空)"));
    });
    console.log("\n==========================================================\n");
  }

  // 3-3. DBにのみ存在する予約
  if (onlyInDb.length > 0) {
    console.log("==========================================================");
    console.log("【★ DBにあってGASにない予約（不正データ）★】");
    console.log("==========================================================");
    onlyInDb.forEach((db, i) => {
      console.log("\n" + (i + 1) + ". reserve_id: " + db.reserve_id);
      console.log("   patient_id: " + db.patient_id);
      console.log("   reserved_time: " + db.reserved_time);
      console.log("   status: " + db.status);
      console.log("   created_at: " + db.created_at);
      console.log("   updated_at: " + db.updated_at);
    });
    console.log("\n==========================================================\n");
  }

  // 4. サマリー
  console.log("==========================================================");
  console.log("【4. サマリー】");
  console.log("==========================================================");
  console.log("GASシート予約数: " + gasReservations.length + " 件");
  console.log("Supabase pending予約数: " + dbPendingReservations.length + " 件");
  console.log("差分: " + (dbPendingReservations.length - gasReservations.length) + " 件");
  console.log();
  console.log("reserve_idベース一致: " + inBoth.length + " 件");
  console.log("reserve_idベースGASのみ: " + onlyInGas.length + " 件");
  console.log("reserve_idベースDBのみ: " + onlyInDb.length + " 件");
  console.log();
  
  if (onlyInGas.length > 0) {
    console.log("★ アクション必要: GASにある予約をDBに同期する必要があります");
    console.log("   件数: " + onlyInGas.length + " 件");
  }
  
  if (onlyInDb.length > 0) {
    console.log("★ アクション必要: DBの余分な予約を削除する必要があります");
    console.log("   件数: " + onlyInDb.length + " 件");
  }
  
  if (onlyInGas.length === 0 && onlyInDb.length === 0) {
    console.log("★ 完全一致: GASシートとDBは完全に同期されています");
  }
  
  console.log("\n==========================================================");
  console.log("  照合完了");
  console.log("==========================================================");
}

reconcileGasDb();
