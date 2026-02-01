// scripts/test-intake-reservation-flow.mjs
// 問診送信→予約作成の完全なフローをテスト

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

console.log("=== 問診送信→予約作成フローテスト ===\n");
console.log(`テスト用 patient_id: ${testPatientId}\n`);

async function testFlow() {
  // ========================================
  // ステップ1: 問診送信
  // ========================================
  console.log("【ステップ1】問診送信");
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
    const intakeText = await intakeResponse.text();
    let intakeJson = {};
    try {
      intakeJson = JSON.parse(intakeText);
    } catch {}

    console.log(`  Response status: ${intakeStatus}`);
    console.log(`  Response: ${JSON.stringify(intakeJson, null, 2)}`);

    if (intakeStatus >= 200 && intakeStatus < 300 && intakeJson.ok) {
      console.log("  ✅ 問診送信成功\n");
    } else {
      console.log("  ❌ 問診送信失敗");
      console.log(`  Response text: ${intakeText}\n`);
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
  // ステップ2: Supabase intakeテーブル確認
  // ========================================
  console.log("\n【ステップ2】Supabase intakeテーブル確認");

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
    console.log(`      answerer_id: ${intakeData.answerer_id || "NULL"}`);
    console.log(`      reserve_id: ${intakeData.reserve_id || "NULL"}`);
    console.log(`      reserved_date: ${intakeData.reserved_date || "NULL"}`);
    console.log(`      answers.name: ${intakeData.answers?.name || "なし"}\n`);
  }

  // ========================================
  // ステップ3: 予約作成
  // ========================================
  console.log("【ステップ3】予約作成");
  console.log(`POST ${productionUrl}/api/reservations`);

  const reservationPayload = {
    date: "2026-02-15",
    time: "10:00",
    patient_id: testPatientId,
  };

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
    const reservationText = await reservationResponse.text();
    let reservationJson = {};
    try {
      reservationJson = JSON.parse(reservationText);
    } catch {}

    console.log(`  Response status: ${reservationStatus}`);
    console.log(`  Response: ${JSON.stringify(reservationJson, null, 2)}`);

    if (reservationStatus >= 200 && reservationStatus < 300 && reservationJson.ok) {
      console.log("  ✅ 予約作成成功");
      console.log(`  reserve_id: ${reservationJson.reserveId}\n`);
    } else {
      console.log("  ❌ 予約作成失敗");
      console.log(`  Response text: ${reservationText}\n`);
      return;
    }
  } catch (error) {
    console.error("  ❌ エラー:", error.message, "\n");
    return;
  }

  // 少し待機
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ========================================
  // ステップ4: Supabase更新確認
  // ========================================
  console.log("【ステップ4】Supabase更新確認");

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
    }
  }

  // reservationsテーブル
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", testPatientId)
    .order("created_at", { ascending: false });

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
  // ステップ5: マイページAPI確認
  // ========================================
  console.log("\n【ステップ5】マイページAPI確認");
  console.log(`GET ${productionUrl}/api/mypage?patient_id=${testPatientId}`);

  try {
    const mypageResponse = await fetch(`${productionUrl}/api/mypage?patient_id=${testPatientId}`, {
      method: "GET",
      headers: {
        "Cookie": `patient_id=${testPatientId}`,
      },
    });

    const mypageStatus = mypageResponse.status;
    const mypageText = await mypageResponse.text();
    let mypageJson = {};
    try {
      mypageJson = JSON.parse(mypageText);
    } catch {}

    console.log(`  Response status: ${mypageStatus}`);

    if (mypageStatus >= 200 && mypageStatus < 300 && mypageJson.ok) {
      console.log("  ✅ マイページAPI成功");

      const reservationInMypage = mypageJson.data?.reservation;
      if (reservationInMypage) {
        console.log(`  📅 予約情報: ${reservationInMypage.reserved_date} ${reservationInMypage.reserved_time}`);
        console.log(`      reserve_id: ${reservationInMypage.reserve_id}`);
        console.log("      ✅ マイページに予約が表示されます");
      } else {
        console.log("  ❌ マイページに予約情報がありません");
        console.log(`  Response: ${JSON.stringify(mypageJson, null, 2)}`);
      }
    } else {
      console.log("  ❌ マイページAPI失敗");
      console.log(`  Response text: ${mypageText}`);
    }
  } catch (error) {
    console.error("  ❌ エラー:", error.message);
  }

  // ========================================
  // クリーンアップ
  // ========================================
  console.log("\n【クリーンアップ】");
  console.log("テストデータを削除しています...");

  await supabase.from("intake").delete().eq("patient_id", testPatientId);
  await supabase.from("answerers").delete().eq("patient_id", testPatientId);
  await supabase.from("reservations").delete().eq("patient_id", testPatientId);

  console.log("✅ テストデータ削除完了\n");

  // ========================================
  // 結論
  // ========================================
  console.log("=== テスト完了 ===");
  console.log("もし問診送信後にintakeレコードが作成されていない場合、");
  console.log("Vercel Dashboard → Functions → /api/intake のログで");
  console.log("詳細なエラーメッセージを確認してください。");
}

testFlow();
