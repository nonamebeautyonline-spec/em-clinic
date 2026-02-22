require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: patients } = await sb.from("patients")
    .select("patient_id, name, name_kana, sex, birthday, tel")
    .is("name_kana", null)
    .not("name", "is", null)
    .order("created_at", { ascending: true })
    .limit(500);

  const pids = patients.map(p => p.patient_id);
  const { data: intakes } = await sb.from("intake")
    .select("patient_id, answers, created_at")
    .in("patient_id", pids)
    .not("answers", "is", null)
    .order("created_at", { ascending: false })
    .limit(10000);

  const answersMap = {};
  for (const r of intakes) {
    if (!answersMap[r.patient_id]) answersMap[r.patient_id] = r.answers;
  }

  let shown = 0;
  for (const p of patients) {
    const a = answersMap[p.patient_id];
    if (!a) continue;

    const kana = a.カナ || a.name_kana || a.フリガナ || null;
    const sex = a.性別 || a.sex || null;
    const bd = a.生年月日 || a.birthday || a.birth || null;
    const tel = a.電話番号 || a.tel || null;

    const recoverable = [];
    if (!p.name_kana && kana) recoverable.push("カナ → " + kana);
    if (!p.sex && sex) recoverable.push("性別 → " + sex);
    if (!p.birthday && bd) recoverable.push("生年月日 → " + (typeof bd === "string" ? bd.slice(0, 10) : bd));
    if (!p.tel && tel) recoverable.push("tel → " + tel);

    if (recoverable.length === 0) continue;

    console.log("■ " + p.patient_id + " " + p.name);
    console.log("  DB現在: カナ=" + (p.name_kana || "×") + " 性別=" + (p.sex || "×") + " 生年月日=" + (p.birthday || "×") + " tel=" + (p.tel || "×"));
    console.log("  穴埋め: " + recoverable.join(" / "));
    console.log("");

    shown++;
    if (shown >= 15) break;
  }
  console.log("（" + shown + "人表示 / 全対象約2,583人）");
})();
