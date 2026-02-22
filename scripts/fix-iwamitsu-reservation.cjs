require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1. 岩満春香を名前で検索
  console.log("=== 岩満春香の患者レコード検索 ===");
  const { data: patients } = await supabase
    .from("patients")
    .select("patient_id, name, tel, line_id")
    .like("name", "%岩満%");

  if (!patients || patients.length === 0) {
    console.log("患者が見つかりません");
    return;
  }

  for (const p of patients) {
    console.log("PID:", p.patient_id, "氏名:", p.name, "電話:", p.tel || "(なし)", "LINE:", p.line_id ? "あり" : "null");
  }

  // 2. 旧PID 20251200554 の状態確認
  console.log("\n=== 旧PID 20251200554 の確認 ===");
  const { data: oldPatient } = await supabase
    .from("patients")
    .select("patient_id, name, tel, line_id")
    .eq("patient_id", "20251200554")
    .maybeSingle();

  if (oldPatient) {
    console.log("旧PID患者レコード: 存在", oldPatient.name);
  } else {
    console.log("旧PID患者レコード: 削除済み（統合完了）");
  }

  // 3. 予約 resv-1766816098690 の確認
  console.log("\n=== 予約 resv-1766816098690 の確認 ===");
  const { data: resv } = await supabase
    .from("reservations")
    .select("*")
    .eq("reserve_id", "resv-1766816098690")
    .maybeSingle();

  if (resv) {
    console.log("予約レコード: 存在");
    console.log("  patient_id:", resv.patient_id);
    console.log("  reserved_date:", resv.reserved_date);
    console.log("  status:", resv.status);
  } else {
    console.log("予約レコード: なし（DB未移行）");
  }

  // 4. 岩満春香の全予約を確認
  console.log("\n=== 岩満春香に紐づく全予約 ===");
  for (const p of patients) {
    const { data: resvs } = await supabase
      .from("reservations")
      .select("reserve_id, patient_id, reserved_date, status")
      .eq("patient_id", p.patient_id);

    if (resvs && resvs.length > 0) {
      for (const r of resvs) {
        console.log("PID:", r.patient_id, "予約ID:", r.reserve_id, "日付:", r.reserved_date, "status:", r.status);
      }
    } else {
      console.log("PID:", p.patient_id, "→ 予約なし");
    }
  }

  // 5. 旧PIDの予約も確認
  const { data: oldResvs } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, reserved_date, status")
    .eq("patient_id", "20251200554");

  if (oldResvs && oldResvs.length > 0) {
    console.log("\n旧PID 20251200554 の予約:");
    for (const r of oldResvs) {
      console.log("  予約ID:", r.reserve_id, "日付:", r.reserved_date, "status:", r.status);
    }
  } else {
    console.log("\n旧PID 20251200554 → 予約なし");
  }

  // 6. intakeも確認
  console.log("\n=== 岩満春香のintake確認 ===");
  for (const p of patients) {
    const { data: intakes } = await supabase
      .from("intake")
      .select("id, patient_id, reserve_id, status")
      .eq("patient_id", p.patient_id);

    if (intakes && intakes.length > 0) {
      for (const i of intakes) {
        console.log("PID:", i.patient_id, "intake_id:", i.id, "reserve_id:", i.reserve_id, "status:", i.status);
      }
    }
  }
})();
