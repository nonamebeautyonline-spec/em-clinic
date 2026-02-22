require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalizeTime(t) {
  if (!t) return "";
  return t.replace(/:00$/, "").replace(/^(\d{2}:\d{2})$/, "$1");
}

(async () => {
  // 今日以降の予約情報がintakeに入っている患者を取得
  const { data: intakes } = await sb.from("intake")
    .select("id, patient_id, patient_name, reserve_id, reserved_date, reserved_time")
    .gte("reserved_date", "2026-02-14")
    .not("reserve_id", "is", null)
    .not("patient_id", "is", null);

  if (!intakes || intakes.length === 0) {
    console.log("該当intakeなし");
    return;
  }

  // 全reserve_idをまとめてreservationsから検索
  const reserveIds = [...new Set(intakes.map(i => i.reserve_id))];
  const { data: resvs } = await sb.from("reservations")
    .select("reserve_id, status, patient_id, reserved_date, reserved_time")
    .in("reserve_id", reserveIds);

  const resvMap = {};
  for (const r of (resvs || [])) {
    resvMap[r.reserve_id] = r;
  }

  const noReservation = [];
  const canceledButIntake = [];

  for (const i of intakes) {
    const r = resvMap[i.reserve_id];
    if (!r) {
      noReservation.push(i);
    } else if (r.status === "canceled") {
      canceledButIntake.push({ intake: i, reservation: r });
    }
  }

  if (noReservation.length > 0) {
    console.log("=== reservationsにレコードがないのにintakeに予約あり: " + noReservation.length + "件 ===");
    console.log("（マイページに予約表示されるが実際は予約なし）\n");
    for (const i of noReservation) {
      console.log("  " + i.patient_id + " " + (i.patient_name || "") + " " + i.reserved_date + " " + i.reserved_time + " reserve_id=" + i.reserve_id);
    }
    console.log("");
  }

  if (canceledButIntake.length > 0) {
    console.log("=== reservationsでcanceledなのにintakeに予約が残っている: " + canceledButIntake.length + "件 ===");
    console.log("（マイページに予約表示されるがDrカルテに出ない）\n");
    for (const { intake: i } of canceledButIntake) {
      console.log("  " + i.patient_id + " " + (i.patient_name || "") + " " + i.reserved_date + " " + i.reserved_time);
    }
    console.log("");
  }

  if (noReservation.length === 0 && canceledButIntake.length === 0) {
    console.log("=== ゴースト予約なし（全て正常） ===");
  }

  console.log("チェック対象intake: " + intakes.length + "件 / ゴースト: " + (noReservation.length + canceledButIntake.length) + "件");
})();
