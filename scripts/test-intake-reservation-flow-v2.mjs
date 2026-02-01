// scripts/test-intake-reservation-flow-v2.mjs
// 問診送信→予約作成の完全なフローをテスト（有効な診療日時を使用）

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
const productionUrl = "https://app.noname-beauty.jp";

const testPatientId = "TEST_FLOW_" + Date.now();

console.log("=== 問診送信→予約作成フローテスト（v2） ===\n");
console.log(`テスト用 patient_id: ${testPatientId}\n`);

async function testFlow() {
  // ========================================
  // ステップ1: 利用可能な予約枠を取得
  // ========================================
  console.log("【ステップ1】利用可能な予約枠を取得");

  let availableDate = null;
  let availableTime = null;

  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);

    const fromDate = tomorrow.toISOString().split("T")[0];
    const toDate = endDate.toISOString().split("T")[0];

    console.log(`  期間: ${fromDate} ～ ${toDate}`);

    const availabilityResponse = await fetch(
      `${productionUrl}/api/reservations?from=${fromDate}&to=${toDate}`,
      {
        method: "GET",
        headers: { "Cookie": `patient_id=${testPatientId}` },
      }
    );

    const availabilityJson = await availabilityResponse.json();

    if (availabilityJson.ok && availabilityJson.slots && availabilityJson.slots.length > 0) {
      // 空いている最初の枠を取得
      const firstSlot = availabilityJson.slots.find(slot => slot.count > 0);
      if (firstSlot) {
        availableDate = firstSlot.date;
        availableTime = firstSlot.time;
        console.log(`  ✅ 利用可能な予約枠: ${availableDate} ${availableTime}\n`);
      } else {
        console.log("  ❌ 空いている予約枠がありません\n");
        console.log("  → 手動で予約可能な日時を指定してください");
        return;
      }
    } else {
      console.log("  ⚠️ 予約枠の取得に失敗しました。デフォルト日時を使用します。");
      // フォールバック: 明日の10:00
      availableDate = fromDate;
      availableTime = "10:00";
      console.log(`  使用する日時: ${availableDate} ${availableTime}\n`);
    }
  } catch (error) {
    console.error("  ❌ エラー:", error.message);
    // フォールバック
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    availableDate = tomorrow.toISOString().split("T")[0];
    availableTime = "10:00";
    console.log(`  フォールバック日時: ${availableDate} ${availableTime}\n`);
  }

  // ========================================
  // ステップ2: 問診送信
  // ========================================
  console.log("【ステップ2】問診送信");
  console.log(`POST ${productionUrl}/api/intake`);

  const intakePayload = {
    answers: {
      氏名: "テスト患者",
      name: "テスト患者",
      性別: "女性",
      sex: "女性",
      生年月日: "1990-01-01",
      birth: "1990-01-01",
      カナ: "テストカンジャ",
      name_kana: "テストカンジャ",
      電話番号: "09012345678",
      tel: "09012345678",
    },
    name: "テスト患者",
    sex: "女性",
    birth: "1990-01-01",
    name_kana: "テストカンジャ",
    tel: "09012345678",
  };

  try {
    const intakeResponse = await fetch(`${productionUrl}/api/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `patient_id=${testPatientId}`,
      },
      body: JSON.stringify(intakePayload),
    });

    const intakeStatus = intakeResponse.status;
    const intakeJson = await intakeResponse.json();

    console.log(`  Response status: ${intakeStatus}`);

    if (intakeStatus >= 200 && intakeStatus < 300 && intakeJson.ok) {
      console.log("  ✅ 問診送信成功\n");
    } else {
      console.log("  ❌ 問診送信失敗");
      console.log(`  Response: ${JSON.stringify(intakeJson, null, 2)}\n`);
      return;
    }
  } catch (error) {
    console.error("  ❌ エラー:", error.message, "\n");
    return;
  }

  // 少し待機（GAS書き込み完了を待つ）
  console.log("  GAS書き込み完了を待機中（3秒）...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // ========================================
  // ステップ3: Supabase intakeテーブル確認
  // ========================================
  console.log("\n【ステップ3】Supabase intakeテーブル確認");

  const { data: intakeData, error: intakeError } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", testPatientId)
    .maybeSingle();

  if (intakeError) {
    console.log(`  ❌ Supabase intakeクエリエラー: ${intakeError.message}\n`);
  } else if (!intakeData) {
    console.log("  ❌ intakeレコードが作成されていません");
    console.log("  → これが問題の原因です！\n");
    return;
  } else {
    console.log("  ✅ intakeレコード作成成功");
    console.log(`      patient_name: ${intakeData.patient_name}`);
    console.log(`      reserve_id: ${intakeData.reserve_id || "NULL"}`);
    console.log(`      reserved_date: ${intakeData.reserved_date || "NULL"}\n`);
  }

  // ========================================
  // ステップ4: 予約作成
  // ========================================
  console.log("【ステップ4】予約作成");
  console.log(`POST ${productionUrl}/api/reservations`);
  console.log(`  日時: ${availableDate} ${availableTime}`);

  const reservationPayload = {
    date: availableDate,
    time: availableTime,
    patient_id: testPatientId,
  };

  let reserveId = null;

  try {
    const reservationResponse = await fetch(`${productionUrl}/api/reservations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `patient_id=${testPatientId}`,
      },
      body: JSON.stringify(reservationPayload),
    });

    const reservationStatus = reservationResponse.status;
    const reservationJson = await reservationResponse.json();

    console.log(`  Response status: ${reservationStatus}`);

    if (reservationStatus >= 200 && reservationStatus < 300 && reservationJson.ok) {
      reserveId = reservationJson.reserveId;
      console.log("  ✅ 予約作成成功");
      console.log(`  reserve_id: ${reserveId}\n`);
    } else {
      console.log("  ❌ 予約作成失敗");
      console.log(`  Response: ${JSON.stringify(reservationJson, null, 2)}\n`);
      console.log("  → 別の日時で再試行してください");

      // クリーンアップして終了
      await supabase.from("intake").delete().eq("patient_id", testPatientId);
      await supabase.from("answerers").delete().eq("patient_id", testPatientId);
      return;
    }
  } catch (error) {
    console.error("  ❌ エラー:", error.message, "\n");
    return;
  }

  // 少し待機
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ========================================
  // ステップ5: Supabase更新確認
  // ========================================
  console.log("【ステップ5】Supabase更新確認");

  // intakeテーブル
  const { data: updatedIntake } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", testPatientId)
    .maybeSingle();

  if (updatedIntake) {
    console.log("  📋 intakeテーブル:");
    console.log(`      reserve_id: ${updatedIntake.reserve_id || "❌ NULL"}`);
    console.log(`      reserved_date: ${updatedIntake.reserved_date || "❌ NULL"}`);
    console.log(`      reserved_time: ${updatedIntake.reserved_time || "❌ NULL"}`);

    if (updatedIntake.reserve_id && updatedIntake.reserved_date && updatedIntake.reserved_time) {
      console.log("      ✅ 予約情報が正しく更新されました");
    } else {
      console.log("      ❌ 予約情報が更新されていません");
      console.log("      → これが「マイページに予約が表示されない」原因です！");
    }
  }

  // reservationsテーブル
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", testPatientId);

  console.log(`\n  📋 reservationsテーブル: ${reservations?.length || 0}件`);
  if (reservations && reservations.length > 0) {
    reservations.forEach((r, idx) => {
      console.log(`      [${idx + 1}] reserve_id: ${r.reserve_id}`);
      console.log(`          date/time: ${r.reserved_date} ${r.reserved_time}`);
      console.log(`          status: ${r.status}`);
    });
    console.log("      ✅ 予約レコード作成成功");
  } else {
    console.log("      ❌ 予約レコードが作成されていません");
  }

  // ========================================
  // クリーンアップ
  // ========================================
  console.log("\n【クリーンアップ】");
  console.log("テストデータを削除しています...");

  await supabase.from("reservations").delete().eq("patient_id", testPatientId);
  await supabase.from("intake").delete().eq("patient_id", testPatientId);
  await supabase.from("answerers").delete().eq("patient_id", testPatientId);

  console.log("✅ テストデータ削除完了\n");

  console.log("=== テスト完了 ===");
}

testFlow();
