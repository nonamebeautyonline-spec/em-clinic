const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // LINE_プレフィックス患者を全取得
  const { data: linePatients } = await sb
    .from("patients")
    .select("patient_id, name, line_id")
    .like("patient_id", "LINE_%");

  console.log("LINE_プレフィックス患者: " + linePatients.length + "件\n");

  // LINE UIDのリスト
  const lineUids = linePatients.filter(p => p.line_id).map(p => p.line_id);

  // 方法1: patients.line_id でマッチ
  const { data: matchByPatient } = await sb
    .from("patients")
    .select("patient_id, name, line_id")
    .in("line_id", lineUids)
    .not("patient_id", "like", "LINE_%");

  console.log("=== 方法1: patients.line_id マッチ: " + matchByPatient.length + "件 ===");
  const matchedUids1 = new Set(matchByPatient.map(p => p.line_id));

  // 方法2: intake.answers->line_id でマッチ（正規患者のintakeを検索）
  // intake の answers.line_id にLINE UIDが入っている正規患者を探す
  const { data: allIntake } = await sb
    .from("intake")
    .select("patient_id, answers")
    .not("patient_id", "like", "LINE_%");

  // intake answers の line_id から正規患者→LINE UIDのマップを作る
  const properByUid = new Map();
  for (const row of allIntake || []) {
    const uid = row.answers?.line_id;
    if (uid && lineUids.includes(uid)) {
      if (!properByUid.has(uid)) {
        properByUid.set(uid, row.patient_id);
      }
    }
  }
  console.log("=== 方法2: intake.answers.line_id マッチ: " + properByUid.size + "件 ===");

  // 統合マッチング
  const merged = new Map(); // line_uid -> proper_patient_id
  for (const p of matchByPatient) {
    merged.set(p.line_id, p.patient_id);
  }
  for (const [uid, pid] of properByUid) {
    if (!merged.has(uid)) {
      merged.set(uid, pid);
    }
  }
  console.log("\n=== 統合マッチ: " + merged.size + "件 ===");

  // 各LINE_患者の状態
  let matchedCount = 0;
  let unmatchedCount = 0;
  const matchedList = [];
  const unmatchedList = [];

  for (const lp of linePatients) {
    const properPid = lp.line_id ? merged.get(lp.line_id) : null;
    if (properPid) {
      matchedCount++;
      matchedList.push({
        line_pid: lp.patient_id,
        line_name: lp.name,
        proper_pid: properPid,
        line_uid: lp.line_id,
      });
    } else {
      unmatchedCount++;
      unmatchedList.push(lp);
    }
  }

  console.log("\nマッチあり: " + matchedCount + "件");
  matchedList.forEach(m =>
    console.log("  " + m.line_pid + " -> " + m.proper_pid + " (" + m.line_name + ")")
  );

  console.log("\nマッチなし: " + unmatchedCount + "件");
  unmatchedList.forEach(m =>
    console.log("  " + m.patient_id + " " + (m.name || "null"))
  );

  // マッチなしの患者がintakeを持っているか確認
  const unmatchedIds = unmatchedList.map(p => p.patient_id);
  const { data: unmatchedIntake } = await sb
    .from("intake")
    .select("patient_id, answers")
    .in("patient_id", unmatchedIds.length > 0 ? unmatchedIds : ["__none__"]);

  console.log("\nマッチなし患者のintake: " + (unmatchedIntake?.length || 0) + "件");
  // これらのintakeにreserve_idはあるか？
  for (const ui of unmatchedIntake || []) {
    const hasName = ui.answers?.name || ui.answers?.氏名;
    console.log("  " + ui.patient_id + " name_in_answers=" + (hasName || "なし"));
  }

  // LINE_患者の予約も確認
  const allLineIds = linePatients.map(p => p.patient_id);
  const { data: reservations } = await sb
    .from("reservations")
    .select("patient_id, reserved_date, reserved_time, status")
    .in("patient_id", allLineIds);
  console.log("\nLINE_患者の予約: " + (reservations?.length || 0) + "件");
  reservations?.forEach(r => console.log("  " + r.patient_id + " " + r.reserved_date + " " + r.reserved_time + " " + r.status));
})();
