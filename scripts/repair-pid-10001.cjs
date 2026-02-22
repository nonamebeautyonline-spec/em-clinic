// PID 10001 衝突修復スクリプト
// 4人の異なる患者が同一PID 10001を共有している問題を修復
//
// 方針:
// - 各LINE IDごとに新しいPIDを発番
// - intake のみ patient_id を更新（answerers は LINE_* が残っている or 新規作成）
// - 原田春陽の予約（canceled）は削除
// - PID 10001 の answerers レコード（渡邉裕大）も新PIDに移行
// - patient_tags も移行

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// PID 10001 の被害患者（LINE IDで識別）
const AFFECTED = [
  {
    lineId: "U0bb53bea6753172d91cbe2ff5c19bbc0",
    name: "安田 乃愛",
    existingAnswererPid: "LINE_5c19bbc0", // 既存の LINE_ answerers レコード
  },
  {
    lineId: "U5b3cbf251d95fb0257afc7a49898e158",
    name: "玉田 楓花",
    existingAnswererPid: "LINE_9898e158",
  },
  {
    lineId: "U8da206f7c3a66d458861fb5f526fd2f9",
    name: "加藤 日菜子",
    existingAnswererPid: null, // answerers レコードなし
  },
  {
    lineId: "Udd9d4b4980cd8d591c06cb0087f954c1",
    name: "渡邉 裕大",
    existingAnswererPid: null, // PID 10001 の answerers = この人
  },
];

async function main() {
  console.log("=== PID 10001 衝突修復 開始 ===\n");

  // 1. 現在の最大数値PID を取得
  const { data: maxRow } = await sb
    .from("answerers")
    .select("patient_id")
    .not("patient_id", "like", "LINE_%")
    .not("patient_id", "like", "TEST_%")
    .order("patient_id", { ascending: false })
    .limit(10);

  let maxNumericId = 10000;
  if (maxRow) {
    for (const row of maxRow) {
      const num = Number(row.patient_id);
      if (!isNaN(num) && num > maxNumericId) {
        maxNumericId = num;
      }
    }
  }
  console.log("現在の最大PID:", maxNumericId);

  // 2. 各患者に新PIDを割り当て
  let nextPid = maxNumericId + 1;
  const assignments = AFFECTED.map((p) => ({
    ...p,
    newPid: String(nextPid++),
  }));

  console.log("\n--- PID割り当て ---");
  assignments.forEach((a) =>
    console.log(`  ${a.name}: ${a.existingAnswererPid || "10001"} → ${a.newPid}`)
  );

  // 3. DRY RUN: まず確認
  console.log("\n--- 修復内容の確認 ---");

  for (const a of assignments) {
    // この LINE ID の intake レコード数
    const { count: intakeCount } = await sb
      .from("intake")
      .select("*", { count: "exact", head: true })
      .eq("patient_id", "10001")
      .eq("line_id", a.lineId);
    console.log(`  ${a.name}: intake ${intakeCount}件を ${a.newPid} に更新`);

    if (a.existingAnswererPid) {
      console.log(`  ${a.name}: answerers ${a.existingAnswererPid} → ${a.newPid} に更新`);
      // LINE_ answerers の intake も更新
      const { count: lineIntakeCount } = await sb
        .from("intake")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", a.existingAnswererPid);
      if (lineIntakeCount > 0) {
        console.log(`  ${a.name}: intake(LINE_) ${lineIntakeCount}件も ${a.newPid} に更新`);
      }
    } else if (a.name === "渡邉 裕大") {
      console.log(`  ${a.name}: answerers PID 10001 → ${a.newPid} に更新`);
    } else {
      console.log(`  ${a.name}: answerers 新規作成 (PID ${a.newPid})`);
    }
  }

  console.log("\n--- 実行中 ---");

  // 4. 各患者の修復を実行
  for (const a of assignments) {
    console.log(`\n[${a.name}] 修復開始...`);

    // 4a. intake の patient_id を更新（PID 10001 + この LINE ID のもの）
    const { error: intakeErr, count: intakeUpdated } = await sb
      .from("intake")
      .update({ patient_id: a.newPid })
      .eq("patient_id", "10001")
      .eq("line_id", a.lineId);
    if (intakeErr) {
      console.error(`  intake更新エラー:`, intakeErr.message);
    } else {
      console.log(`  intake: ${intakeUpdated ?? "?"}件を PID ${a.newPid} に更新`);
    }

    // 4b. answerers の処理
    if (a.existingAnswererPid) {
      // LINE_ answerers レコードの patient_id を新PIDに更新
      const { error: ansErr } = await sb
        .from("answerers")
        .update({ patient_id: a.newPid })
        .eq("patient_id", a.existingAnswererPid);
      if (ansErr) {
        console.error(`  answerers更新エラー:`, ansErr.message);
      } else {
        console.log(`  answerers: ${a.existingAnswererPid} → ${a.newPid}`);
      }

      // LINE_ PID の intake も新PIDに更新
      const { error: lineIntakeErr } = await sb
        .from("intake")
        .update({ patient_id: a.newPid })
        .eq("patient_id", a.existingAnswererPid);
      if (lineIntakeErr) {
        console.error(`  intake(LINE_)更新エラー:`, lineIntakeErr.message);
      }

      // LINE_ PID の message_log も更新
      await sb
        .from("message_log")
        .update({ patient_id: a.newPid })
        .eq("patient_id", a.existingAnswererPid);

      // LINE_ PID の patient_tags も更新
      await sb
        .from("patient_tags")
        .update({ patient_id: a.newPid })
        .eq("patient_id", a.existingAnswererPid);

      // LINE_ PID の patient_marks も更新
      await sb
        .from("patient_marks")
        .update({ patient_id: a.newPid })
        .eq("patient_id", a.existingAnswererPid);

    } else if (a.name === "渡邉 裕大") {
      // PID 10001 の answerers レコードを新PIDに更新
      const { error: ansErr } = await sb
        .from("answerers")
        .update({ patient_id: a.newPid })
        .eq("patient_id", "10001");
      if (ansErr) {
        console.error(`  answerers更新エラー:`, ansErr.message);
      } else {
        console.log(`  answerers: 10001 → ${a.newPid}`);
      }
    } else {
      // answerers レコードがない → 新規作成
      // intake の answers から個人情報を取得
      const { data: latestIntake } = await sb
        .from("intake")
        .select("answers")
        .eq("patient_id", a.newPid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const answers = latestIntake?.answers || {};
      const { error: insErr } = await sb.from("answerers").insert({
        patient_id: a.newPid,
        name: a.name,
        name_kana: answers.カナ || answers.name_kana || "",
        sex: answers.性別 || answers.sex || "",
        birthday: answers.生年月日 || answers.birth || "",
        line_id: a.lineId,
      });
      if (insErr) {
        console.error(`  answerers作成エラー:`, insErr.message);
      } else {
        console.log(`  answerers: 新規作成 PID ${a.newPid}`);
      }
    }

    console.log(`[${a.name}] 完了`);
  }

  // 5. PID 10001 の patient_tags を削除（もう参照する患者がいない）
  const { error: tagErr } = await sb
    .from("patient_tags")
    .delete()
    .eq("patient_id", "10001");
  if (tagErr) {
    console.error("patient_tags削除エラー:", tagErr.message);
  } else {
    console.log("\npatient_tags (PID 10001): 削除完了");
  }

  // 6. 原田春陽の canceled 予約を削除（患者データが存在しないゴーストレコード）
  const { error: resvErr } = await sb
    .from("reservations")
    .delete()
    .eq("patient_id", "10001")
    .eq("status", "canceled");
  if (resvErr) {
    console.error("reservations削除エラー:", resvErr.message);
  } else {
    console.log("reservations (原田春陽 canceled): 削除完了");
  }

  // 7. PID 10001 の残留データを確認
  console.log("\n--- 修復後の確認 ---");

  const { count: remainingAnswerers } = await sb
    .from("answerers")
    .select("*", { count: "exact", head: true })
    .eq("patient_id", "10001");
  console.log("answerers PID 10001 残留:", remainingAnswerers, "件");

  const { count: remainingIntake } = await sb
    .from("intake")
    .select("*", { count: "exact", head: true })
    .eq("patient_id", "10001");
  console.log("intake PID 10001 残留:", remainingIntake, "件");

  const { count: remainingResv } = await sb
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("patient_id", "10001");
  console.log("reservations PID 10001 残留:", remainingResv, "件");

  // 8. 各患者の最終状態を確認
  console.log("\n--- 各患者の最終状態 ---");
  for (const a of assignments) {
    const { data: ans } = await sb
      .from("answerers")
      .select("patient_id, name, line_id")
      .eq("patient_id", a.newPid)
      .maybeSingle();
    const { count: ic } = await sb
      .from("intake")
      .select("*", { count: "exact", head: true })
      .eq("patient_id", a.newPid);
    console.log(`  ${a.name} (PID ${a.newPid}): answerers=${ans ? "OK" : "MISSING"}, intake=${ic}件`);
  }

  console.log("\n=== 修復完了 ===");
}

main().catch(console.error);
