// りさこ・ほのか両方の予約状況を確認
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((l) => {
  const t = l.trim();
  if (!t || t.startsWith("#")) return;
  const i = t.indexOf("=");
  if (i === -1) return;
  let v = t.substring(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.substring(0, i).trim()] = v;
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function showPatient(label, pid) {
  console.log(`\n======= ${label} (${pid}) =======`);

  // reservations テーブル
  const { data: resvs } = await sb.from("reservations")
    .select("id, reserve_id, patient_name, reserved_date, reserved_time, status, note, prescription_menu")
    .eq("patient_id", pid)
    .order("reserved_date", { ascending: false });

  console.log(`  reservations: ${resvs ? resvs.length : 0}件`);
  if (resvs) {
    for (const r of resvs) {
      console.log(`    id=${r.id} ${r.reserved_date} ${r.reserved_time} status=${r.status} name=${r.patient_name}`);
      console.log(`    reserve_id=${r.reserve_id}`);
      if (r.prescription_menu) console.log(`    prescription_menu=${r.prescription_menu}`);
    }
  }

  // intake の予約関連カラム
  const { data: intakes } = await sb.from("intake")
    .select("id, reserve_id, reserved_date, reserved_time, status, patient_name")
    .eq("patient_id", pid)
    .order("created_at", { ascending: true });

  console.log(`  intake: ${intakes ? intakes.length : 0}件`);
  if (intakes) {
    for (const i of intakes) {
      console.log(`    id=${i.id} name=${i.patient_name} status=${i.status} reserve_id=${i.reserve_id} date=${i.reserved_date} time=${i.reserved_time}`);
    }
  }
}

async function main() {
  await showPatient("りさこ（植本理紗子）", "20260200701");
  await showPatient("ほのか（新家穂花）", "20260200905");
}

main().catch(console.error);
