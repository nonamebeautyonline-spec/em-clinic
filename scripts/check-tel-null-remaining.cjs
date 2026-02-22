require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // tel=null の患者数
  const { count: telNull } = await supabase.from("patients").select("*", { count: "exact", head: true }).is("tel", null);
  const { count: total } = await supabase.from("patients").select("*", { count: "exact", head: true });
  console.log("全患者:", total);
  console.log("tel=null:", telNull);

  // tel=null の患者のうち、intake.answers に電話番号が入っている人
  const { data: nullPatients } = await supabase
    .from("patients")
    .select("patient_id, name, line_id, created_at")
    .is("tel", null)
    .limit(10000);

  let hasPhoneInIntake = 0;
  const samples = [];

  for (let i = 0; i < nullPatients.length; i += 500) {
    const batch = nullPatients.slice(i, i + 500);
    const pids = batch.map(p => p.patient_id);
    const { data: intakes } = await supabase
      .from("intake")
      .select("patient_id, answers")
      .in("patient_id", pids);

    if (intakes) {
      for (const intake of intakes) {
        const answers = intake.answers;
        if (!answers) continue;
        // answers内の電話番号を探す
        const tel = answers.tel || answers.phone || answers.telephone;
        if (tel && tel.trim()) {
          hasPhoneInIntake++;
          const pat = batch.find(p => p.patient_id === intake.patient_id);
          if (samples.length < 10) {
            samples.push({
              pid: intake.patient_id,
              name: pat?.name || "(なし)",
              intakeTel: tel,
              hasLine: pat?.line_id ? "あり" : "null",
            });
          }
        }
      }
    }
  }

  console.log("tel=null + intake.answersに電話あり:", hasPhoneInIntake, "人");

  if (samples.length > 0) {
    console.log("\nサンプル:");
    console.log("PID\t氏名\tintake電話\tLINE");
    for (const s of samples) {
      console.log([s.pid, s.name, s.intakeTel, s.hasLine].join("\t"));
    }
  }

  // tel=null でLINE IDがある人（今後重複リスクあり）
  const withLine = nullPatients.filter(p => p.line_id);
  console.log("\ntel=null + LINE IDあり（重複リスク）:", withLine.length, "人");
})();
