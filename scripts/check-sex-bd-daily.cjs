require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data } = await sb.from("patients")
    .select("patient_id, sex, birthday, name_kana, created_at")
    .gte("created_at", "2026-02-01")
    .order("created_at", { ascending: true })
    .limit(10000);

  const dayDist = {};
  for (const p of data) {
    const d = p.created_at ? p.created_at.slice(0, 10) : "不明";
    if (!dayDist[d]) dayDist[d] = { sexOk: 0, sexNull: 0, bdOk: 0, bdNull: 0, kanaOk: 0, kanaNull: 0, total: 0 };
    dayDist[d].total++;
    if (p.sex) dayDist[d].sexOk++; else dayDist[d].sexNull++;
    if (p.birthday) dayDist[d].bdOk++; else dayDist[d].bdNull++;
    if (p.name_kana) dayDist[d].kanaOk++; else dayDist[d].kanaNull++;
  }

  console.log("日付\t\t全体\tsex有\tsex無\tBD有\tBD無\tカナ有\tカナ無");
  for (const d of Object.keys(dayDist).sort()) {
    const s = dayDist[d];
    console.log([d, s.total, s.sexOk, s.sexNull, s.bdOk, s.bdNull, s.kanaOk, s.kanaNull].join("\t"));
  }
})();
