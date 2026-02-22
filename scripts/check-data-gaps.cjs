// scripts/check-data-gaps.cjs
// GAS→DB移行後のデータギャップ総合診断
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log("=== GAS→DB データギャップ診断 ===\n");

  // 1. patients テーブルの基本統計
  const { count: totalPatients } = await supabase.from("patients").select("*", { count: "exact", head: true });
  const { count: nameNull } = await supabase.from("patients").select("*", { count: "exact", head: true }).is("name", null);
  const { count: kanaNull } = await supabase.from("patients").select("*", { count: "exact", head: true }).is("name_kana", null);
  const { count: telNull } = await supabase.from("patients").select("*", { count: "exact", head: true }).is("tel", null);
  const { count: lineNull } = await supabase.from("patients").select("*", { count: "exact", head: true }).is("line_id", null);
  const { count: sexNull } = await supabase.from("patients").select("*", { count: "exact", head: true }).is("sex", null);
  const { count: birthdayNull } = await supabase.from("patients").select("*", { count: "exact", head: true }).is("birthday", null);

  console.log("【1. patients テーブル】");
  console.log(`  全患者: ${totalPatients}`);
  console.log(`  name=null: ${nameNull}`);
  console.log(`  name_kana=null: ${kanaNull}`);
  console.log(`  tel=null: ${telNull}`);
  console.log(`  line_id=null: ${lineNull}`);
  console.log(`  sex=null: ${sexNull}`);
  console.log(`  birthday=null: ${birthdayNull}`);

  // 2. answerers テーブルの基本統計
  const { count: totalAnswerers } = await supabase.from("answerers").select("*", { count: "exact", head: true });
  const { count: ansNameNull } = await supabase.from("answerers").select("*", { count: "exact", head: true }).is("name", null);
  const { count: ansKanaNull } = await supabase.from("answerers").select("*", { count: "exact", head: true }).is("name_kana", null);
  const { count: ansTelNull } = await supabase.from("answerers").select("*", { count: "exact", head: true }).is("tel", null);

  console.log("\n【2. answerers テーブル】");
  console.log(`  全answerers: ${totalAnswerers}`);
  console.log(`  name=null: ${ansNameNull}`);
  console.log(`  name_kana=null: ${ansKanaNull}`);
  console.log(`  tel=null: ${ansTelNull}`);

  // 3. patients に存在するが intake レコードがない患者
  const { data: allPatients } = await supabase
    .from("patients")
    .select("patient_id, name, created_at")
    .limit(100000);

  const { data: intakePids } = await supabase
    .from("intake")
    .select("patient_id")
    .limit(100000);

  const intakePidSet = new Set((intakePids || []).map(i => i.patient_id));
  const noIntake = (allPatients || []).filter(p => !intakePidSet.has(p.patient_id));

  console.log("\n【3. intake レコードなしの患者】");
  console.log(`  patients にいるが intake なし: ${noIntake.length}人`);
  if (noIntake.length > 0 && noIntake.length <= 30) {
    console.log("  一覧:");
    for (const p of noIntake) {
      console.log(`    ${p.patient_id} ${p.name || "(名前なし)"} (作成: ${p.created_at?.slice(0, 10)})`);
    }
  } else if (noIntake.length > 30) {
    console.log("  先頭20件:");
    for (const p of noIntake.slice(0, 20)) {
      console.log(`    ${p.patient_id} ${p.name || "(名前なし)"} (作成: ${p.created_at?.slice(0, 10)})`);
    }
  }

  // 4. patients に存在するが answerers にないレコード
  const { data: answerersAll } = await supabase
    .from("answerers")
    .select("patient_id")
    .limit(100000);

  const answerersPidSet = new Set((answerersAll || []).map(a => a.patient_id));
  const noAnswerer = (allPatients || []).filter(p => !answerersPidSet.has(p.patient_id));

  console.log("\n【4. answerers レコードなしの患者】");
  console.log(`  patients にいるが answerers なし: ${noAnswerer.length}人`);
  if (noAnswerer.length > 0 && noAnswerer.length <= 30) {
    for (const p of noAnswerer) {
      console.log(`    ${p.patient_id} ${p.name || "(名前なし)"}`);
    }
  }

  // 5. intake.answers が null/空のレコード
  const { count: answersNull } = await supabase.from("intake").select("*", { count: "exact", head: true }).is("answers", null);
  const { count: totalIntake } = await supabase.from("intake").select("*", { count: "exact", head: true });

  console.log("\n【5. intake テーブル】");
  console.log(`  全intake: ${totalIntake}`);
  console.log(`  answers=null: ${answersNull}`);

  // 6. orders テーブル
  const { count: totalOrders } = await supabase.from("orders").select("*", { count: "exact", head: true });
  const { data: orderPids } = await supabase
    .from("orders")
    .select("patient_id")
    .limit(100000);

  const orderPidSet = new Set((orderPids || []).map(o => o.patient_id));

  console.log("\n【6. orders テーブル】");
  console.log(`  全orders: ${totalOrders}`);
  console.log(`  ユニーク患者数: ${orderPidSet.size}`);

  // 7. patients.name が null の患者の詳細（intake.answers から復元可能か？）
  if (nameNull > 0) {
    const { data: nameNullPatients } = await supabase
      .from("patients")
      .select("patient_id, line_id, tel, created_at")
      .is("name", null)
      .limit(50);

    console.log("\n【7. name=null 患者の復元可能性】");
    let recoverable = 0;
    for (const p of nameNullPatients || []) {
      const { data: intakeData } = await supabase
        .from("intake")
        .select("answers, patient_name")
        .eq("patient_id", p.patient_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const intakeName = intakeData?.patient_name
        || intakeData?.answers?.氏名
        || intakeData?.answers?.name
        || null;

      const { data: ansData } = await supabase
        .from("answerers")
        .select("name")
        .eq("patient_id", p.patient_id)
        .maybeSingle();

      const answererName = ansData?.name || null;
      const source = intakeName ? "intake" : answererName ? "answerers" : "なし";

      if (intakeName || answererName) recoverable++;
      console.log(`  ${p.patient_id} LINE=${p.line_id ? "あり" : "null"} tel=${p.tel || "null"} → 復元元: ${source} (${intakeName || answererName || "-"})`);
    }
    console.log(`  復元可能: ${recoverable}/${(nameNullPatients || []).length}`);
  }

  // 8. name_kana が null の患者のうち intake.answers にカナがある人
  if (kanaNull > 0) {
    const { data: kanaPatients } = await supabase
      .from("patients")
      .select("patient_id, name")
      .is("name_kana", null)
      .not("name", "is", null) // 名前はあるがカナがない人
      .limit(100);

    let kanaRecoverable = 0;
    for (const p of kanaPatients || []) {
      const { data: intakeData } = await supabase
        .from("intake")
        .select("answers")
        .eq("patient_id", p.patient_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const kana = intakeData?.answers?.フリガナ
        || intakeData?.answers?.name_kana
        || intakeData?.answers?.ふりがな
        || null;

      if (kana) kanaRecoverable++;
    }
    console.log("\n【8. name_kana=null（名前あり）の復元可能性】");
    console.log(`  対象: ${(kanaPatients || []).length}人`);
    console.log(`  intake.answersにカナあり: ${kanaRecoverable}人`);
  }

  // 9. sex/birthday が null の患者で intake.answers から復元可能な人
  if (sexNull > 0 || birthdayNull > 0) {
    const { data: infoMissing } = await supabase
      .from("patients")
      .select("patient_id, name, sex, birthday")
      .not("name", "is", null)
      .limit(100000);

    let sexRecoverable = 0;
    let bdRecoverable = 0;
    const sexMissingPids = (infoMissing || []).filter(p => !p.sex);
    const bdMissingPids = (infoMissing || []).filter(p => !p.birthday);

    // サンプリング（最大50件）
    for (const p of sexMissingPids.slice(0, 50)) {
      const { data: intakeData } = await supabase
        .from("intake")
        .select("answers")
        .eq("patient_id", p.patient_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const sex = intakeData?.answers?.性別 || intakeData?.answers?.sex || null;
      if (sex) sexRecoverable++;
    }
    for (const p of bdMissingPids.slice(0, 50)) {
      const { data: intakeData } = await supabase
        .from("intake")
        .select("answers")
        .eq("patient_id", p.patient_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const bd = intakeData?.answers?.生年月日 || intakeData?.answers?.birthday || null;
      if (bd) bdRecoverable++;
    }

    console.log("\n【9. sex/birthday 欠損の復元可能性（名前あり患者、サンプル50件）】");
    console.log(`  sex=null: ${sexMissingPids.length}人 → intake復元可能: ${sexRecoverable}/${Math.min(50, sexMissingPids.length)}`);
    console.log(`  birthday=null: ${bdMissingPids.length}人 → intake復元可能: ${bdRecoverable}/${Math.min(50, bdMissingPids.length)}`);
  }

  // 10. GAS問診マスターCSV (/tmp/monshin.csv) があれば追加チェック
  const fs = require("fs");
  if (fs.existsSync("/tmp/monshin.csv")) {
    console.log("\n【10. GAS問診マスターCSVとの突合】");
    const csv = fs.readFileSync("/tmp/monshin.csv", "utf-8");
    const lines = csv.split("\n").filter(l => l.trim());
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    console.log("  カラム: " + headers.join(", "));
    console.log("  行数: " + (lines.length - 1));

    // name, name_kana, sex, birthday, tel 等のカラムがあるか
    const hasName = headers.includes("name");
    const hasKana = headers.includes("name_kana") || headers.includes("master_I_name_kana");
    const hasSex = headers.includes("sex") || headers.includes("master_I_sex");
    const hasBd = headers.includes("birthday") || headers.includes("master_I_birthday");
    const hasTel = headers.includes("tel") || headers.includes("master_I_tel");
    console.log(`  name: ${hasName}, kana: ${hasKana}, sex: ${hasSex}, birthday: ${hasBd}, tel: ${hasTel}`);
  } else {
    console.log("\n【10. GAS問診マスターCSV (/tmp/monshin.csv) が見つかりません】");
    console.log("  電話番号バックフィル時に使用したCSVが /tmp に残っていません。");
    console.log("  GASから再エクスポートすれば name_kana, sex, birthday のバックフィルも可能です。");
  }

  console.log("\n=== 診断完了 ===");
})();
