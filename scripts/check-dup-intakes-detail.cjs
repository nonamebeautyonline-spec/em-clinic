const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 空の2件目（answerer_id=null, reserve_id=null）のintakeのanswersを確認
  // → どのコードパスで作られたか判別
  const emptyIds = [33912, 32048, 34003, 31976, 33954, 33983, 34086, 34207, 33974, 34237, 28536, 34102, 34112, 33894];

  const { data } = await sb.from("intake")
    .select("id, patient_id, created_at, answers")
    .in("id", emptyIds);

  for (const r of (data || [])) {
    const keys = r.answers ? Object.keys(r.answers) : [];
    console.log(
      "id:", r.id,
      "| pid:", r.patient_id,
      "| created:", (r.created_at || "").substring(0, 19),
      "| answers keys:", keys.length > 0 ? keys.join(", ") : "(空)"
    );
  }
})();
