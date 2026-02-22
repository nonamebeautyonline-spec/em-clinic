const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // 正規患者で line_id が null のものを取得
  const { data: nullLinePatients } = await sb
    .from("patients")
    .select("patient_id, name, line_id")
    .is("line_id", null)
    .not("patient_id", "like", "LINE_%");

  console.log("正規患者で line_id=null: " + nullLinePatients.length + "件\n");

  // それぞれの intake を確認して、answers.line_id がある場合は紐づけ対象
  let needFix = [];

  for (const p of nullLinePatients) {
    const { data: intakes } = await sb
      .from("intake")
      .select("answers")
      .eq("patient_id", p.patient_id);

    for (const intake of intakes || []) {
      const uid = intake.answers?.line_id;
      if (uid && uid.startsWith("U")) {
        needFix.push({
          patient_id: p.patient_id,
          name: p.name,
          line_uid: uid,
        });
        break; // 1件見つかれば十分
      }
    }
  }

  console.log("=== line_id=null だが intake に LINE UID あり: " + needFix.length + "件 ===");
  needFix.forEach((f) =>
    console.log("  " + f.patient_id + " " + f.name + " -> " + f.line_uid)
  );

  // 重複チェック: この LINE UID が他の正規患者にすでに設定されていないか
  const uids = needFix.map((f) => f.line_uid);
  if (uids.length > 0) {
    const { data: existing } = await sb
      .from("patients")
      .select("patient_id, name, line_id")
      .in("line_id", uids);
    console.log("\n=== 同じ LINE UID がすでに設定されている正規患者 ===");
    existing?.forEach((e) =>
      console.log("  " + e.patient_id + " " + e.name + " " + e.line_id)
    );

    // 重複がない患者のみ更新対象
    const existingUids = new Set(existing?.map((e) => e.line_id) || []);
    const safeToFix = needFix.filter((f) => !existingUids.has(f.line_uid));
    console.log("\n=== 安全に更新可能: " + safeToFix.length + "件 ===");
    safeToFix.forEach((f) =>
      console.log("  " + f.patient_id + " " + f.name + " -> " + f.line_uid)
    );
  }
})();
