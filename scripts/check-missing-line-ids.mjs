import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

// 問診完了済み（ng_checkあり）でline_idがない人を検索
const { data, error } = await supabase
  .from("intake")
  .select("patient_id, patient_name, line_id, answers, updated_at")
  .not("patient_id", "like", "LINE_%")
  .order("updated_at", { ascending: false });

if (error) { console.error(error); process.exit(1); }

const noLineId = [];
const hasIntakeNoLine = [];

for (const r of data) {
  const a = r.answers || {};
  const hasNgCheck = a.ng_check && a.ng_check !== "";

  if (!r.line_id && hasNgCheck) {
    hasIntakeNoLine.push(r);
  } else if (!r.line_id && r.patient_id.startsWith("2026")) {
    noLineId.push(r);
  }
}

console.log("=== 問診完了済み + line_idなし ===");
console.log(`${hasIntakeNoLine.length}人\n`);
for (const r of hasIntakeNoLine) {
  console.log(`${r.patient_id} | ${(r.patient_name || "(空)").padEnd(10)} | updated: ${r.updated_at}`);
}

console.log(`\n=== 問診未完了 + line_idなし（patient_idが2026始まり）===`);
console.log(`${noLineId.length}人\n`);
for (const r of noLineId.slice(0, 20)) {
  console.log(`${r.patient_id} | ${(r.patient_name || "(空)").padEnd(10)} | updated: ${r.updated_at}`);
}
if (noLineId.length > 20) console.log(`  ... 他${noLineId.length - 20}人`);
