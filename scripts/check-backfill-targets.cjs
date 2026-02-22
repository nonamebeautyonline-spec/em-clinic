// scripts/check-backfill-targets.cjs
// 各フィールドごとに「null + intake.answersから復元可能」な患者数を集計
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 全患者取得
  const { data: patients } = await sb.from("patients")
    .select("patient_id, name, name_kana, sex, birthday, tel")
    .limit(100000);

  // 全intakeのanswers取得（patient_idごとに最新1件）
  const { data: intakes } = await sb.from("intake")
    .select("patient_id, answers, created_at")
    .not("answers", "is", null)
    .order("created_at", { ascending: false })
    .limit(100000);

  // patient_id → 最新answers のマップ
  const answersMap = {};
  for (const r of intakes) {
    if (!answersMap[r.patient_id]) {
      answersMap[r.patient_id] = r.answers;
    }
  }

  let kanaTargets = 0;
  let sexTargets = 0;
  let bdTargets = 0;
  let telTargets = 0;
  let nameTargets = 0;

  const kanaSamples = [];
  const sexSamples = [];
  const bdSamples = [];
  const telSamples = [];

  for (const p of patients) {
    const a = answersMap[p.patient_id];
    if (!a) continue; // intake.answersなし → スキップ

    // name_kana
    if (!p.name_kana) {
      const kana = a.カナ || a.name_kana || a.フリガナ || a.ふりがな || null;
      if (kana && kana.trim()) {
        kanaTargets++;
        if (kanaSamples.length < 5) kanaSamples.push({ pid: p.patient_id, name: p.name, kana });
      }
    }

    // sex
    if (!p.sex) {
      const sex = a.性別 || a.sex || null;
      if (sex && sex.trim()) {
        sexTargets++;
        if (sexSamples.length < 5) sexSamples.push({ pid: p.patient_id, name: p.name, sex });
      }
    }

    // birthday
    if (!p.birthday) {
      const bd = a.生年月日 || a.birthday || a.birth || null;
      if (bd && bd.toString().trim()) {
        bdTargets++;
        if (bdSamples.length < 5) bdSamples.push({ pid: p.patient_id, name: p.name, bd });
      }
    }

    // tel
    if (!p.tel) {
      const tel = a.電話番号 || a.tel || a.phone || null;
      if (tel && tel.trim()) {
        telTargets++;
        if (telSamples.length < 5) telSamples.push({ pid: p.patient_id, name: p.name, tel });
      }
    }

    // name
    if (!p.name) {
      const name = a.氏名 || a.name || null;
      if (name && name.trim()) {
        nameTargets++;
      }
    }
  }

  console.log("=== バックフィル対象（null + intake.answersから復元可能）===\n");
  console.log("フィールド\t対象数\t全null数");
  console.log("name_kana\t" + kanaTargets + "\t" + patients.filter(p => !p.name_kana).length);
  console.log("sex\t\t" + sexTargets + "\t" + patients.filter(p => !p.sex).length);
  console.log("birthday\t" + bdTargets + "\t" + patients.filter(p => !p.birthday).length);
  console.log("tel\t\t" + telTargets + "\t" + patients.filter(p => !p.tel).length);
  console.log("name\t\t" + nameTargets + "\t" + patients.filter(p => !p.name).length);

  console.log("\n--- name_kana サンプル ---");
  for (const s of kanaSamples) console.log("  " + s.pid + " " + (s.name || "") + " → " + s.kana);

  console.log("\n--- sex サンプル ---");
  for (const s of sexSamples) console.log("  " + s.pid + " " + (s.name || "") + " → " + s.sex);

  console.log("\n--- birthday サンプル ---");
  for (const s of bdSamples) console.log("  " + s.pid + " " + (s.name || "") + " → " + s.bd);

  console.log("\n--- tel サンプル ---");
  for (const s of telSamples) console.log("  " + s.pid + " " + (s.name || "") + " → " + s.tel);

  // 復元不可の内訳（null + answersにもない）
  let kanaUnrecoverable = 0;
  let sexUnrecoverable = 0;
  let bdUnrecoverable = 0;
  for (const p of patients) {
    const a = answersMap[p.patient_id];
    if (!p.name_kana) {
      if (!a || !(a.カナ || a.name_kana || a.フリガナ || a.ふりがな)) kanaUnrecoverable++;
    }
    if (!p.sex) {
      if (!a || !(a.性別 || a.sex)) sexUnrecoverable++;
    }
    if (!p.birthday) {
      if (!a || !(a.生年月日 || a.birthday || a.birth)) bdUnrecoverable++;
    }
  }
  console.log("\n=== 復元不可（answersにもデータなし）===");
  console.log("name_kana: " + kanaUnrecoverable);
  console.log("sex: " + sexUnrecoverable);
  console.log("birthday: " + bdUnrecoverable);
})();
