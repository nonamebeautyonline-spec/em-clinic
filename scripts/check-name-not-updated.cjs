// 個人情報提出済み（name_kana あり）なのに patients.name が display name のまま更新されていない患者を検出
const { createClient } = require("@supabase/supabase-js");
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 個人情報入力済み（name_kana あり）かつ display name もある患者
  const { data: patients } = await c.from("patients")
    .select("patient_id, name, name_kana, line_display_name")
    .not("patient_id", "like", "LINE_%")
    .not("patient_id", "like", "TEST_%")
    .not("name_kana", "is", null)
    .not("line_display_name", "is", null);

  console.log("個人情報入力済み + display name あり:", patients.length, "件\n");

  // name = display name の人（本名に更新されていない可能性）
  const nameEqualsDisplay = patients.filter(p => p.name === p.line_display_name);
  console.log("うち name = display name:", nameEqualsDisplay.length, "件\n");

  // その中で intake の氏名が異なる人（= 本名が別にある）
  const problems = [];
  const genuineSame = []; // 本名 = display name（問題なし）

  for (const p of nameEqualsDisplay) {
    // 最も古い intake（個人情報フォーム提出時のデータ）
    const { data: intakes } = await c.from("intake")
      .select("answers")
      .eq("patient_id", p.patient_id)
      .not("answers", "is", null)
      .order("id", { ascending: true });

    let intakeName = null;
    if (intakes) {
      for (const i of intakes) {
        const ans = i.answers || {};
        const n = ans["氏名"] || ans["name"];
        if (n) { intakeName = n; break; }
      }
    }

    if (intakeName && intakeName !== p.name) {
      problems.push({ pid: p.patient_id, current: p.name, intakeName, kana: p.name_kana });
    } else {
      genuineSame.push(p);
    }
  }

  console.log("本名 = display name（問題なし）:", genuineSame.length, "件");
  console.log("intakeに別の本名あり（要修正）:", problems.length, "件\n");

  if (problems.length > 0) {
    console.log("--- 修正対象 ---");
    for (const m of problems) {
      console.log(m.pid, "| 現在:", m.current, "→ 本名:", m.intakeName);
    }
  }

  // name が null の人も確認（個人情報入力済みなのに name がない）
  const { data: nullName } = await c.from("patients")
    .select("patient_id, name_kana, line_display_name")
    .not("patient_id", "like", "LINE_%")
    .not("patient_id", "like", "TEST_%")
    .not("name_kana", "is", null)
    .is("name", null);

  if (nullName && nullName.length > 0) {
    console.log("\n--- name=null なのに name_kana あり（さっきリセットした人含む？） ---");
    for (const p of nullName) {
      console.log(p.patient_id, "| カナ:", p.name_kana, "| display:", p.line_display_name);
    }
  }
})();
