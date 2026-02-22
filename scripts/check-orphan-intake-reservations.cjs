require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

  console.log("intakeに予約情報がある: " + intakes.length + "件\n");

  // 全reserve_idをまとめてreservationsから検索
  const reserveIds = [...new Set(intakes.map(i => i.reserve_id))];
  const { data: resvs } = await sb.from("reservations")
    .select("reserve_id, status, patient_id, reserved_date, reserved_time")
    .in("reserve_id", reserveIds);

  const resvMap = {};
  for (const r of (resvs || [])) {
    resvMap[r.reserve_id] = r;
  }

  // 問題パターン検出
  const noReservation = []; // reservationsにレコードがない
  const canceledButIntake = []; // reservationsでcanceledだがintakeに残っている
  const mismatch = []; // 日時が食い違う

  for (const i of intakes) {
    const r = resvMap[i.reserve_id];
    if (!r) {
      noReservation.push(i);
    } else if (r.status === "canceled") {
      canceledButIntake.push({ intake: i, reservation: r });
    } else if (r.reserved_date !== i.reserved_date || r.reserved_time !== i.reserved_time) {
      mismatch.push({ intake: i, reservation: r });
    }
  }

  if (noReservation.length > 0) {
    console.log("=== reservationsにレコードがないのにintakeに予約あり: " + noReservation.length + "件 ===");
    console.log("（マイページに予約表示されるがDrカルテに出ない）");
    for (const i of noReservation) {
      console.log("  " + i.patient_id + " " + (i.patient_name || "") + " " + i.reserved_date + " " + i.reserved_time + " reserve_id=" + i.reserve_id);
    }
    console.log("");
  }

  if (canceledButIntake.length > 0) {
    console.log("=== reservationsでcanceledだがintakeに予約情報が残っている: " + canceledButIntake.length + "件 ===");
    console.log("（マイページに予約表示されるがDrカルテに出ない）");
    for (const { intake: i, reservation: r } of canceledButIntake) {
      console.log("  " + i.patient_id + " " + (i.patient_name || "") + " " + i.reserved_date + " " + i.reserved_time);
      console.log("    reservations.status=" + r.status);
    }
    console.log("");
  }

  if (mismatch.length > 0) {
    console.log("=== intakeとreservationsで日時が食い違っている: " + mismatch.length + "件 ===");
    for (const { intake: i, reservation: r } of mismatch) {
      console.log("  " + i.patient_id + " " + (i.patient_name || ""));
      console.log("    intake:  " + i.reserved_date + " " + i.reserved_time);
      console.log("    reserv:  " + r.reserved_date + " " + r.reserved_time);
    }
    console.log("");
  }

  if (noReservation.length === 0 && canceledButIntake.length === 0 && mismatch.length === 0) {
    console.log("=== 問題なし（全て整合） ===");
  }

  console.log("合計: intake=" + intakes.length + " / 問題=" + (noReservation.length + canceledButIntake.length + mismatch.length));
})();
