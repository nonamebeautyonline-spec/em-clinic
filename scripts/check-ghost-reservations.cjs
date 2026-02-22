require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 今日以降のcanceled予約を取得
  const { data: canceled } = await sb.from("reservations")
    .select("reserve_id, patient_id, patient_name, reserved_date, reserved_time, status")
    .eq("status", "canceled")
    .gte("reserved_date", "2026-02-14");

  if (!canceled || canceled.length === 0) {
    console.log("canceled予約なし");
    return;
  }

  console.log("canceled予約: " + canceled.length + "件\n");

  // 各canceledのreserve_idがintakeに残っていないかチェック
  const ghosts = [];
  for (const r of canceled) {
    const { data: intakes } = await sb.from("intake")
      .select("id, patient_id, patient_name, reserve_id, reserved_date, reserved_time")
      .eq("patient_id", r.patient_id)
      .not("reserve_id", "is", null)
      .not("reserved_date", "is", null);

    if (intakes && intakes.length > 0) {
      // intakeにreserve_id等が残っている = マイページに予約表示される
      for (const i of intakes) {
        ghosts.push({
          patient_id: r.patient_id,
          patient_name: r.patient_name || i.patient_name,
          resv_reserve_id: r.reserve_id,
          resv_date: r.reserved_date,
          resv_time: r.reserved_time,
          resv_status: r.status,
          intake_id: i.id,
          intake_reserve_id: i.reserve_id,
          intake_date: i.reserved_date,
          intake_time: i.reserved_time,
          same_reserve_id: r.reserve_id === i.reserve_id,
        });
      }
    }
  }

  if (ghosts.length === 0) {
    console.log("=== ゴースト予約なし（全てintakeもクリア済み） ===");
    return;
  }

  // same_reserve_id=true のものが特に問題（キャンセルしたのにintakeに同じreserve_idが残っている）
  const exact = ghosts.filter(g => g.same_reserve_id);
  const other = ghosts.filter(g => !g.same_reserve_id);

  if (exact.length > 0) {
    console.log("=== キャンセル済みなのにintakeにreserve_idが残っている: " + exact.length + "件 ===");
    for (const g of exact) {
      console.log("  " + g.patient_id + " " + g.patient_name);
      console.log("    予約: " + g.resv_date + " " + g.resv_time + " reserve_id=" + g.resv_reserve_id);
      console.log("    intake: reserve_id=" + g.intake_reserve_id + " date=" + g.intake_date + " time=" + g.intake_time);
      console.log("");
    }
  }

  if (other.length > 0) {
    console.log("=== キャンセル済み患者でintakeに別の予約が残っている: " + other.length + "件 ===");
    for (const g of other) {
      console.log("  " + g.patient_id + " " + g.patient_name);
      console.log("    canceled予約: " + g.resv_date + " " + g.resv_time + " reserve_id=" + g.resv_reserve_id);
      console.log("    intake: reserve_id=" + g.intake_reserve_id + " date=" + g.intake_date + " time=" + g.intake_time);
      console.log("");
    }
  }
})();
