import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

const ids = [
  "20260200565","20260200568","20260200570","20260200576","20260200577",
  "20260200580","20260200581","20260200582","20260200583","20260200585",
  "20260200588","20260200346"
];

const { data } = await supabase.from("intake")
  .select("patient_id, patient_name, answers, line_id")
  .in("patient_id", ids);

console.log("=== 12人の個人情報詳細 ===\n");
console.log("# | patient_id   | 氏名       | カナ       | 性別 | 生年月日   | 電話番号       | ng_check");
console.log("-".repeat(105));

let i = 1;
for (const id of ids) {
  const r = data.find(d => d.patient_id === id);
  if (!r) { console.log(`${i} | ${id} | (レコードなし)`); i++; continue; }
  const a = r.answers || {};
  const name = (r.patient_name || "(空)").padEnd(8);
  const kana = (a.カナ || a.name_kana || "-").padEnd(10);
  const sex = (a.性別 || a.sex || "-").padEnd(2);
  const birth = (a.生年月日 || a.birth || "-").toString().substring(0, 10).padEnd(10);
  const tel = (a.電話番号 || a.tel || "-").padEnd(14);
  const ng = a.ng_check || "-";
  console.log(`${String(i).padStart(2)} | ${id} | ${name} | ${kana} | ${sex} | ${birth} | ${tel} | ${ng}`);
  i++;
}
