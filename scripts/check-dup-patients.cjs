const { createClient } = require("@supabase/supabase-js");
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data, error } = await c.from("patients")
    .select("line_id, patient_id, name, tel")
    .not("line_id", "is", null)
    .not("patient_id", "like", "LINE_%")
    .order("line_id");

  if (error) { console.log("Error:", error.message); return; }

  const groups = {};
  for (const p of data) {
    if (!groups[p.line_id]) groups[p.line_id] = [];
    groups[p.line_id].push(p);
  }

  const dups = Object.entries(groups).filter(([_, v]) => v.length > 1);
  console.log("=== 同一line_idで複数patient_idがある患者 ===");
  console.log("重複グループ数:", dups.length);

  for (const [lid, patients] of dups) {
    console.log("\nline_id: ..." + lid.slice(-8));
    for (const p of patients) {
      console.log("  ", p.patient_id, p.name || "(名前なし)", p.tel || "(tel未設定)");
    }
  }

  // 同一 patient_id で複数レコードがある場合もチェック
  const pidGroups = {};
  for (const p of data) {
    if (!pidGroups[p.patient_id]) pidGroups[p.patient_id] = [];
    pidGroups[p.patient_id].push(p);
  }
  const pidDups = Object.entries(pidGroups).filter(([_, v]) => v.length > 1);
  if (pidDups.length > 0) {
    console.log("\n=== 同一patient_idで複数レコード ===");
    console.log("重複数:", pidDups.length);
    for (const [pid, patients] of pidDups) {
      console.log("\n  patient_id:", pid);
      for (const p of patients) {
        console.log("    line_id: ..." + (p.line_id || "null").slice(-8), p.name || "(名前なし)");
      }
    }
  }

  console.log("\n=== 総患者数（LINE連携あり） ===", data.length);
})();
