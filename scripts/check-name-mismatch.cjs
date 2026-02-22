// patients.name が LINE display name のまま、intakeに別の本名がある患者を検出
const { createClient } = require("@supabase/supabase-js");
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: patients } = await c.from("patients")
    .select("patient_id, name, name_kana, line_display_name, tel")
    .not("patient_id", "like", "LINE_%")
    .not("patient_id", "like", "TEST_%")
    .not("name", "is", null)
    .not("line_display_name", "is", null);

  const suspects = patients.filter(p => p.name === p.line_display_name);
  console.log("patients.name = line_display_name の患者:", suspects.length, "件\n");

  let mismatchCount = 0;
  let noIntakeNameCount = 0;
  let sameCount = 0;
  const mismatches = [];

  for (const p of suspects) {
    const { data: intakes } = await c.from("intake")
      .select("answers")
      .eq("patient_id", p.patient_id)
      .order("id", { ascending: true })
      .limit(1);

    if (intakes && intakes.length > 0) {
      const ans = intakes[0].answers || {};
      const intakeName = ans["氏名"] || ans["name"] || null;
      if (intakeName && intakeName !== p.name) {
        mismatchCount++;
        mismatches.push({ pid: p.patient_id, current: p.name, intakeName, kana: p.name_kana });
      } else if (!intakeName) {
        noIntakeNameCount++;
      } else {
        sameCount++;
      }
    } else {
      noIntakeNameCount++;
    }
  }

  console.log("intakeに別の本名がある（要修正）:", mismatchCount, "件");
  console.log("intakeに氏名なし:", noIntakeNameCount, "件");
  console.log("intake氏名とname一致（本名＝display name）:", sameCount, "件\n");

  if (mismatches.length > 0) {
    console.log("--- 修正対象 ---");
    for (const m of mismatches) {
      console.log(m.pid, "| 現在:", m.current, "→ 本名:", m.intakeName, "| カナ:", m.kana);
    }
  }
})();
