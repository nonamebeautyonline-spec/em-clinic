const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z_0-9]*)=["']?([^"']*)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // 今回の対象患者のpatients.id（旧patient_id）を取得
  const today = new Date().toISOString().split("T")[0];
  const { data: reservations } = await supabase
    .from("reservations")
    .select("patient_id, patient_name")
    .eq("reserved_date", today)
    .not("status", "in", '("canceled","NG","no_show")');

  const pids = [...new Set(reservations.map(r => r.patient_id))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, patient_id, name")
    .in("patient_id", pids);

  // patients.id の値（例: 13814）が、別の患者のpatient_idと一致するか？
  const internalIds = patients.map(p => String(p.id));
  
  const { data: collisions } = await supabase
    .from("patients")
    .select("id, patient_id, name")
    .in("patient_id", internalIds);

  if (collisions && collisions.length > 0) {
    console.log("⚠ 衝突あり！以下のpatient_idが別患者に一致:");
    for (const c of collisions) {
      const original = patients.find(p => String(p.id) === c.patient_id);
      console.log(`  patients.id=${c.patient_id} → 別患者「${c.name}」のトーク画面に表示されていた可能性`);
      console.log(`    本来の送信先: 「${original?.name}」`);
    }
  } else {
    console.log("✓ 衝突なし。旧patient_id（数値ID）は他の患者のpatient_idと一致しなかったため、別人のトーク画面には表示されていません。");
  }
})();
