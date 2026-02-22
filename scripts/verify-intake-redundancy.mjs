// scripts/verify-intake-redundancy.mjs
// Phase 2-0: intakeテーブルの冗長カラムが他テーブルに存在するか検証
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runQuery(label, query) {
  const { data, error } = await sb.rpc("exec_sql", { sql: query });
  if (error) {
    // rpc が使えない場合は直接クエリで代替
    console.log(`  [${label}] RPC不可、直接クエリで実行...`);
    return null;
  }
  return data;
}

async function main() {
  console.log("=== Phase 2-0: intake冗長カラム整合性チェック ===\n");

  // 1. intake に reserve_id があるが reservations に対応がないレコード
  console.log("1. 孤立 reserve_id（intakeにあるがreservationsにない）:");
  const { data: orphanRes, error: e1 } = await sb
    .from("intake")
    .select("id, reserve_id, patient_id, patient_name, created_at")
    .not("reserve_id", "is", null);

  if (e1) {
    console.log("  エラー:", e1.message);
  } else {
    // reservationsからreserve_idの一覧を取得
    const { data: allRes } = await sb
      .from("reservations")
      .select("reserve_id");
    const resIds = new Set((allRes || []).map((r) => r.reserve_id));

    const orphans = (orphanRes || []).filter(
      (i) => !resIds.has(i.reserve_id)
    );
    console.log(`  合計intake(reserve_id有): ${orphanRes.length}`);
    console.log(`  孤立件数: ${orphans.length}`);
    if (orphans.length > 0 && orphans.length <= 20) {
      orphans.forEach((o) =>
        console.log(
          `    id=${o.id} reserve_id=${o.reserve_id} patient=${o.patient_name} created=${o.created_at}`
        )
      );
    }
  }

  // 2. intake に patient_id があるが patients に対応がないレコード
  console.log("\n2. 孤立 patient_id（intakeにあるがpatientsにない）:");
  const { data: allIntake, error: e2 } = await sb
    .from("intake")
    .select("patient_id")
    .not("patient_id", "is", null);

  const { data: allPatients, error: e2b } = await sb
    .from("patients")
    .select("patient_id");

  if (e2 || e2b) {
    console.log("  エラー:", e2?.message || e2b?.message);
  } else {
    const patientIds = new Set((allPatients || []).map((p) => p.patient_id));
    const intakePatientIds = new Set(
      (allIntake || []).map((i) => i.patient_id)
    );
    const missing = [...intakePatientIds].filter((pid) => !patientIds.has(pid));
    console.log(`  intake内のユニーク patient_id数: ${intakePatientIds.size}`);
    console.log(`  patientsにない patient_id数: ${missing.length}`);
    if (missing.length > 0 && missing.length <= 20) {
      missing.forEach((pid) => console.log(`    patient_id=${pid}`));
    }
  }

  // 3. reserved_date/time が不一致のレコード
  console.log("\n3. reserved_date/time 不一致（intake vs reservations）:");
  const { data: intakesWithRes, error: e3 } = await sb
    .from("intake")
    .select("id, reserve_id, reserved_date, reserved_time, patient_name")
    .not("reserve_id", "is", null)
    .not("reserved_date", "is", null);

  if (e3) {
    console.log("  エラー:", e3.message);
  } else {
    // reserve_idで予約を引く
    const reserveIds = [
      ...new Set((intakesWithRes || []).map((i) => i.reserve_id)),
    ];
    const { data: reservations } = await sb
      .from("reservations")
      .select("reserve_id, reserved_date, reserved_time")
      .in("reserve_id", reserveIds.length > 0 ? reserveIds : ["__none__"]);

    const resMap = new Map(
      (reservations || []).map((r) => [r.reserve_id, r])
    );

    let dateMismatch = 0;
    let timeMismatch = 0;
    const mismatches = [];
    for (const i of intakesWithRes || []) {
      const r = resMap.get(i.reserve_id);
      if (!r) continue;
      if (i.reserved_date !== r.reserved_date) {
        dateMismatch++;
        if (mismatches.length < 5)
          mismatches.push({
            id: i.id,
            intake_date: i.reserved_date,
            res_date: r.reserved_date,
          });
      }
      if (
        i.reserved_time &&
        r.reserved_time &&
        i.reserved_time !== r.reserved_time
      ) {
        timeMismatch++;
      }
    }
    console.log(`  日付不一致: ${dateMismatch}件`);
    console.log(`  時刻不一致: ${timeMismatch}件`);
    if (mismatches.length > 0) {
      mismatches.forEach((m) =>
        console.log(
          `    id=${m.id} intake=${m.intake_date} res=${m.res_date}`
        )
      );
    }
  }

  // 4. patient_name が不一致のレコード（最新intakeのみ）
  console.log("\n4. patient_name 不一致（intake vs patients）:");
  const { data: intakeNames, error: e4 } = await sb
    .from("intake")
    .select("id, patient_id, patient_name, created_at")
    .not("patient_name", "is", null)
    .not("patient_id", "is", null)
    .order("created_at", { ascending: false });

  if (e4) {
    console.log("  エラー:", e4.message);
  } else {
    // patient_idごとに最新のintakeだけ取る
    const latestByPid = new Map();
    for (const i of intakeNames || []) {
      if (!latestByPid.has(i.patient_id)) {
        latestByPid.set(i.patient_id, i);
      }
    }

    const pids = [...latestByPid.keys()];
    const { data: patientsData } = await sb
      .from("patients")
      .select("patient_id, name")
      .in("patient_id", pids.length > 0 ? pids : ["__none__"]);

    const pMap = new Map(
      (patientsData || []).map((p) => [p.patient_id, p.name])
    );

    let nameMismatch = 0;
    const nameMismatches = [];
    for (const [pid, intake] of latestByPid) {
      const pName = pMap.get(pid);
      if (pName && intake.patient_name && pName !== intake.patient_name) {
        nameMismatch++;
        if (nameMismatches.length < 10)
          nameMismatches.push({
            pid,
            intake: intake.patient_name,
            patient: pName,
          });
      }
    }
    console.log(`  比較対象: ${latestByPid.size}人`);
    console.log(`  氏名不一致: ${nameMismatch}件`);
    if (nameMismatches.length > 0) {
      nameMismatches.forEach((m) =>
        console.log(
          `    pid=${m.pid} intake="${m.intake}" patients="${m.patient}"`
        )
      );
    }
  }

  // 5. line_id が不一致のレコード
  console.log("\n5. line_id 不一致（intake vs patients）:");
  const { data: intakeLineIds, error: e5 } = await sb
    .from("intake")
    .select("id, patient_id, line_id, reserve_id")
    .not("line_id", "is", null)
    .not("patient_id", "is", null)
    .not("reserve_id", "is", null); // 問診本体のみ

  if (e5) {
    console.log("  エラー:", e5.message);
  } else {
    const pidSet = [
      ...new Set((intakeLineIds || []).map((i) => i.patient_id)),
    ];
    const { data: patientsLine } = await sb
      .from("patients")
      .select("patient_id, line_id")
      .in("patient_id", pidSet.length > 0 ? pidSet : ["__none__"]);

    const plMap = new Map(
      (patientsLine || []).map((p) => [p.patient_id, p.line_id])
    );

    let lineIdMismatch = 0;
    const lineMismatches = [];
    for (const i of intakeLineIds || []) {
      const pLineId = plMap.get(i.patient_id);
      if (pLineId && i.line_id && pLineId !== i.line_id) {
        lineIdMismatch++;
        if (lineMismatches.length < 5)
          lineMismatches.push({
            pid: i.patient_id,
            intake: i.line_id,
            patient: pLineId,
          });
      }
    }
    console.log(`  比較対象: ${intakeLineIds.length}件`);
    console.log(`  line_id不一致: ${lineIdMismatch}件`);
    if (lineMismatches.length > 0) {
      lineMismatches.forEach((m) =>
        console.log(
          `    pid=${m.pid} intake="${m.intake}" patients="${m.patient}"`
        )
      );
    }
  }

  // 6. prescription_menu 不一致（intake vs reservations）
  console.log("\n6. prescription_menu 不一致（intake vs reservations）:");
  const { data: intakeMenus, error: e6 } = await sb
    .from("intake")
    .select("id, reserve_id, prescription_menu")
    .not("reserve_id", "is", null)
    .not("prescription_menu", "is", null);

  if (e6) {
    console.log("  エラー:", e6.message);
  } else {
    const menuResIds = [
      ...new Set((intakeMenus || []).map((i) => i.reserve_id)),
    ];
    const { data: resMenus } = await sb
      .from("reservations")
      .select("reserve_id, prescription_menu")
      .in(
        "reserve_id",
        menuResIds.length > 0 ? menuResIds : ["__none__"]
      );

    const rmMap = new Map(
      (resMenus || []).map((r) => [r.reserve_id, r.prescription_menu])
    );

    let menuMismatch = 0;
    for (const i of intakeMenus || []) {
      const rMenu = rmMap.get(i.reserve_id);
      if (rMenu && i.prescription_menu && rMenu !== i.prescription_menu) {
        menuMismatch++;
      }
    }
    console.log(`  比較対象: ${intakeMenus.length}件`);
    console.log(`  不一致: ${menuMismatch}件`);
  }

  // サマリー
  console.log("\n=== 検証完了 ===");
  console.log(
    "全カウントが 0 であれば Phase 2-2 に進んで問題ありません。"
  );
  console.log(
    "不一致がある場合は Phase 2-1 の修復スクリプトを実行します。"
  );
}

main().catch(console.error);
