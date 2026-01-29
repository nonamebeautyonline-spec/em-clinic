// scripts/sync-all-reservations-to-db.mjs
// intakeテーブルから全予約データをreservationsテーブルに同期

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

async function syncAllReservations() {
  console.log("=== 全予約データ同期 ===\n");

  // 1. intakeテーブルから予約情報を持つ全レコードを取得（limit解除）
  console.log("1. intakeテーブルから予約情報を取得中...");

  let allIntakes = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("intake")
      .select("reserve_id, patient_id, patient_name, reserved_date, reserved_time, status, note, prescription_menu")
      .not("reserve_id", "is", null)
      .range(offset, offset + batchSize - 1)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching intake:", error);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    allIntakes = allIntakes.concat(data);
    console.log(`   取得済み: ${allIntakes.length} 件`);

    if (data.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  console.log(`\n   総取得件数: ${allIntakes.length} 件\n`);

  // 2. reservationsテーブルの既存データを取得
  console.log("2. reservationsテーブルの既存データ取得中...");

  let existingReservations = [];
  offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("reservations")
      .select("reserve_id")
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error("Error fetching reservations:", error);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    existingReservations = existingReservations.concat(data);
    console.log(`   取得済み: ${existingReservations.length} 件`);

    if (data.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  const existingReserveIds = new Set(existingReservations.map(r => r.reserve_id));
  console.log(`\n   既存予約数: ${existingReserveIds.size} 件\n`);

  // 3. 新規作成と更新を分類
  const toCreate = [];
  const toUpdate = [];

  for (const intake of allIntakes) {
    if (!intake.reserve_id) continue;

    const reservationData = {
      reserve_id: intake.reserve_id,
      patient_id: intake.patient_id,
      patient_name: intake.patient_name || null,
      reserved_date: intake.reserved_date || null,
      reserved_time: intake.reserved_time || null,
      status: intake.status || "pending",
      note: intake.note || null,
      prescription_menu: intake.prescription_menu || null,
    };

    if (existingReserveIds.has(intake.reserve_id)) {
      toUpdate.push(reservationData);
    } else {
      toCreate.push(reservationData);
    }
  }

  console.log(`3. 分類結果:`);
  console.log(`   新規作成: ${toCreate.length} 件`);
  console.log(`   更新: ${toUpdate.length} 件\n`);

  // 4. 新規作成（バッチ処理）
  if (toCreate.length > 0) {
    console.log("4. 新規予約を作成中...");

    const createBatchSize = 100;
    let created = 0;
    let failed = 0;

    for (let i = 0; i < toCreate.length; i += createBatchSize) {
      const batch = toCreate.slice(i, i + createBatchSize);

      const { error } = await supabase
        .from("reservations")
        .insert(batch);

      if (error) {
        console.error(`   ❌ Batch ${Math.floor(i / createBatchSize) + 1} failed:`, error.message);
        failed += batch.length;
      } else {
        created += batch.length;
        console.log(`   ✅ Batch ${Math.floor(i / createBatchSize) + 1}: ${batch.length} 件作成 (累計: ${created})`);
      }
    }

    console.log(`\n   作成成功: ${created} 件`);
    if (failed > 0) {
      console.log(`   作成失敗: ${failed} 件`);
    }
  }

  // 5. 更新（バッチ処理 - upsert使用）
  if (toUpdate.length > 0) {
    console.log("\n5. 既存予約を更新中...");

    const updateBatchSize = 100;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
      const batch = toUpdate.slice(i, i + updateBatchSize);

      const { error } = await supabase
        .from("reservations")
        .upsert(batch, {
          onConflict: "reserve_id",
        });

      if (error) {
        console.error(`   ❌ Batch ${Math.floor(i / updateBatchSize) + 1} failed:`, error.message);
        failed += batch.length;
      } else {
        updated += batch.length;
        console.log(`   ✅ Batch ${Math.floor(i / updateBatchSize) + 1}: ${batch.length} 件更新 (累計: ${updated})`);
      }
    }

    console.log(`\n   更新成功: ${updated} 件`);
    if (failed > 0) {
      console.log(`   更新失敗: ${failed} 件`);
    }
  }

  // 6. 最終確認
  console.log("\n=== 同期完了 ===");

  const { count: finalCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true });

  console.log(`reservationsテーブル最終レコード数: ${finalCount} 件`);
  console.log(`intakeテーブルの予約データ: ${allIntakes.length} 件`);

  if (finalCount >= allIntakes.length) {
    console.log("✅ 全予約データの同期が完了しました");
  } else {
    console.log(`⚠️ 差分あり: ${allIntakes.length - finalCount} 件`);
  }
}

syncAllReservations();
