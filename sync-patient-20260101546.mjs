// sync-patient-20260101546.mjs
// 患者 20260101546 の予約データを手動でSupabaseに同期

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 患者 20260101546 の予約データを同期 ===\n");

const patientId = "20260101546";
const reserveId = "resv-1769585993379";
const reservedDate = "2026-01-28";
const reservedTime = "16:45";

// 患者名は問診シートから取得する必要があるため、一旦nullで進める
// 後でGASのfindNameFromIntakeByPid_を使うか、手動で設定
const patientName = null; // ← 問診シートから確認が必要

try {
  console.log("1. intakeテーブルを更新中...\n");

  const { error: intakeError } = await supabase
    .from("intake")
    .update({
      reserve_id: reserveId,
      reserved_date: reservedDate,
      reserved_time: reservedTime,
    })
    .eq("patient_id", patientId);

  if (intakeError) {
    console.error("❌ intake更新エラー:", intakeError);
  } else {
    console.log("✅ intakeテーブルを更新しました");
    console.log(`   reserve_id: ${reserveId}`);
    console.log(`   reserved_date: ${reservedDate}`);
    console.log(`   reserved_time: ${reservedTime}`);
  }

  console.log("\n2. reservationsテーブルに予約を追加中...\n");

  const { error: reserveError } = await supabase
    .from("reservations")
    .insert({
      reserve_id: reserveId,
      patient_id: patientId,
      patient_name: patientName,
      reserved_date: reservedDate,
      reserved_time: reservedTime,
      status: "pending",
      note: null,
      prescription_menu: null,
    });

  if (reserveError) {
    console.error("❌ reservations追加エラー:", reserveError);
  } else {
    console.log("✅ reservationsテーブルに予約を追加しました");
  }

  console.log("\n3. キャッシュをクリア中...\n");

  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    console.log("⚠️  ADMIN_TOKEN が設定されていません。キャッシュクリアをスキップします。");
  } else {
    const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "https://app.noname-beauty.jp";

    const res = await fetch(`${vercelUrl}/api/admin/invalidate-cache`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ patient_id: patientId }),
    });

    if (res.ok) {
      console.log("✅ キャッシュをクリアしました");
    } else {
      console.log("⚠️  キャッシュクリア失敗:", res.status);
    }
  }

  console.log("\n=== 完了 ===\n");
  console.log("マイページを再読み込みして、予約が表示されるか確認してください。");

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
