// check-patient-in-sheet.mjs
// 特定患者のGoogleシート状態を確認（問診シート＋予約シート）

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL;
const patientId = "20260101538"; // 名古路　美樹

console.log(`=== Patient ${patientId} のシート状態確認 ===\n`);

try {
  // 問診シートを確認
  console.log("1. 問診シート確認中...");
  const intakeRes = await fetch(GAS_INTAKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getDashboard",
      patient_id: patientId,
      full: 1,
    }),
  });

  const intakeData = await intakeRes.json();

  if (!intakeRes.ok || !intakeData.ok) {
    console.log("❌ 問診シート取得失敗:", intakeData);
  } else {
    console.log("\n問診シート（getDashboard）:");
    console.log("  初回診察:");
    if (intakeData.firstVisit) {
      console.log(`    状態: ${intakeData.firstVisit.status || "(未判定)"}`);
      console.log(`    予約: ${intakeData.firstVisit.reserve_id || "(なし)"}`);
      console.log(`    予約日時: ${intakeData.firstVisit.reserved_date || ""} ${intakeData.firstVisit.reserved_time || ""}`);
    } else {
      console.log("    (初回診察データなし)");
    }

    console.log("\n  次回予約:");
    if (intakeData.nextReservation) {
      console.log(`    予約ID: ${intakeData.nextReservation.reserve_id || "(なし)"}`);
      console.log(`    予約日時: ${intakeData.nextReservation.reserved_date || ""} ${intakeData.nextReservation.reserved_time || ""}`);
      console.log(`    状態: ${intakeData.nextReservation.status || "(未判定)"}`);
    } else {
      console.log("    (次回予約なし)");
    }

    console.log("\n  再処方申請:");
    if (intakeData.reorders && intakeData.reorders.length > 0) {
      intakeData.reorders.forEach((r, idx) => {
        console.log(`    ${idx + 1}. ID ${r.id}: ${r.status} - ${r.product_code}`);
      });
    } else {
      console.log("    (再処方申請なし)");
    }
  }

  // Supabaseでも確認
  console.log("\n\n2. Supabase確認中...");

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: intakeDB, error: intakeError } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (intakeError) {
    console.log("❌ Supabase intake取得失敗:", intakeError.message);
  } else {
    console.log("\nSupabase intake:");
    console.log(`  Patient ID: ${intakeDB.patient_id}`);
    console.log(`  Patient Name: ${intakeDB.patient_name || "(なし)"}`);
    console.log(`  Reserve ID: ${intakeDB.reserve_id || "(なし)"}`);
    console.log(`  Status: ${intakeDB.status || "(未判定)"}`);
    console.log(`  Created: ${intakeDB.created_at}`);
  }

  const { data: reservationDB, error: reserveError } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (reserveError) {
    console.log("\n❌ Supabase reservations取得失敗:", reserveError.message);
  } else {
    console.log("\nSupabase reservations:");
    if (reservationDB.length === 0) {
      console.log("  (予約なし)");
    } else {
      reservationDB.forEach((r, idx) => {
        console.log(`  ${idx + 1}. Reserve ID: ${r.reserve_id || "(なし)"}`);
        console.log(`     日時: ${r.reserved_date || ""} ${r.reserved_time || ""}`);
        console.log(`     Status: ${r.status || "(未判定)"}`);
        console.log("");
      });
    }
  }

  console.log("\n=== 診断 ===");

  if (!intakeDB.reserve_id && (!reservationDB || reservationDB.length === 0)) {
    console.log("⚠️  問診送信済みだが予約なし → 予約画面に進めるはず（キャッシュクリア済み）");
  } else if (intakeDB.reserve_id) {
    console.log("✓ intakeに予約IDあり（問診→予約済み）");
  } else {
    console.log("✓ reservationsに予約あり");
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  console.error(err.stack);
}
