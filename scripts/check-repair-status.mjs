import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

const IDS = [
  "20260200565","20260200568","20260200570","20260200572",
  "20260200576","20260200577","20260200580","20260200581",
  "20260200582","20260200583","20260200585","20260200588",
  "20260200591","20260200592",
];

const { data } = await supabase
  .from("intake")
  .select("patient_id, patient_name, answers")
  .in("patient_id", IDS);

let done = 0;
let pending = 0;

console.log("# | patient_id   | 氏名       | カナ       | 性別 | 生年月日   | 電話番号       | 状態");
console.log("-".repeat(100));

for (const pid of IDS) {
  const r = data.find(d => d.patient_id === pid);
  const a = (r?.answers || {});
  const kana = a.カナ || a.name_kana || "";
  const sex = a.性別 || a.sex || "";
  const birth = a.生年月日 || a.birth || "";
  const tel = a.電話番号 || a.tel || "";
  const ok = kana && sex && birth && tel;
  if (ok) done++; else pending++;
  const status = ok ? "OK" : "未入力";
  const name = (r?.patient_name || "(空)").padEnd(10);
  console.log(`${pid} | ${name} | ${(kana || "-").padEnd(10)} | ${(sex || "-").padEnd(2)} | ${(birth || "-").toString().substring(0,10).padEnd(10)} | ${(tel || "-").padEnd(14)} | ${status}`);
}

console.log(`\n入力済み: ${done}人 / 未入力: ${pending}人`);
