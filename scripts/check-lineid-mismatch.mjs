import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

const today = "2026-02-08T00:00:00+09:00";

// 今日作成されたintakeでline_idがnull
const { data: intakes } = await supabase
  .from("intake")
  .select("patient_id, patient_name, line_id")
  .not("patient_id", "like", "LINE_%")
  .is("line_id", null)
  .gte("created_at", today);

if (intakes.length === 0) { console.log("intake.line_idがnullの人はいません"); process.exit(0); }

const pids = intakes.map(i => i.patient_id);
const { data: answerers } = await supabase
  .from("answerers")
  .select("patient_id, line_id, name")
  .in("patient_id", pids);

console.log("=== 今日登録 + intake.line_id=null ===\n");
console.log("patient_id   | 氏名       | answerers.line_id");
console.log("-".repeat(80));

let mismatch = 0;
let noLine = 0;
for (const i of intakes) {
  const a = answerers.find(x => x.patient_id === i.patient_id);
  const aLineId = a ? a.line_id : null;
  const status = aLineId ? "★ 復元可能" : "line_idなし";
  if (aLineId) mismatch++;
  else noLine++;
  console.log(`${i.patient_id} | ${(i.patient_name || "(空)").padEnd(10)} | ${aLineId || "-"} ${status}`);
}

console.log(`\n復元可能（answerers にline_idあり）: ${mismatch}人`);
console.log(`line_id完全なし: ${noLine}人`);
