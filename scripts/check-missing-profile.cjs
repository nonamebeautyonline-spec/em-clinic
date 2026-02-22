// name あり（個人情報フォーム提出済み）だが name_kana/sex/birthday が欠損している患者を検出
const { createClient } = require("@supabase/supabase-js");
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data, count } = await c.from("patients")
    .select("patient_id, name, name_kana, sex, birthday, tel, line_display_name, created_at", { count: "exact" })
    .not("patient_id", "like", "LINE_%")
    .not("patient_id", "like", "TEST_%")
    .not("name", "is", null)
    .is("name_kana", null)
    .limit(100000);

  console.log("name あり + name_kana null:", count, "件\n");

  const webhookOnly = data.filter(p => p.name === p.line_display_name);
  const formSubmitted = data.filter(p => p.name !== p.line_display_name);

  console.log("name = display name（フォーム未提出、webhook由来）:", webhookOnly.length, "件");
  console.log("name != display name（フォーム提出済みなのに欠損）:", formSubmitted.length, "件\n");

  if (formSubmitted.length > 0) {
    console.log("--- フォーム提出済みなのに欠損 ---");
    for (const p of formSubmitted) {
      console.log(p.patient_id, "| name:", p.name, "| display:", p.line_display_name || "(なし)", "| sex:", p.sex, "| tel:", p.tel, "| created:", (p.created_at || "").slice(0, 10));
    }
  }

  // intake answers に個人情報があるか確認
  if (formSubmitted.length > 0) {
    console.log("\n--- intake で復元可能か ---");
    let recoverable = 0;
    for (const p of formSubmitted) {
      const { data: intakes } = await c.from("intake")
        .select("answers")
        .eq("patient_id", p.patient_id)
        .order("id", { ascending: true });

      let kana = null;
      if (intakes) {
        for (const i of intakes) {
          const ans = i.answers || {};
          kana = ans["カナ"] || ans["name_kana"] || null;
          if (kana) break;
        }
      }
      if (kana) {
        recoverable++;
        console.log(p.patient_id, "| intake カナ:", kana, "→ 復元可能");
      } else {
        console.log(p.patient_id, "| intake にもカナなし → 復元不可");
      }
    }
    console.log("\n復元可能:", recoverable, "/ 復元不可:", formSubmitted.length - recoverable);
  }
})();
