import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

// 問診完了済みの10人
const ids = ["20260200458","20260200565","20260200582","20260200583","20260200585","20260200577","20260100110","20260200576","20260200580","20260200346"];

const { data } = await supabase.from("intake")
  .select("patient_id, patient_name, answers")
  .in("patient_id", ids);

console.log("=== answers内の個人情報チェック（問診完了10人）===\n");
console.log("patient_id   | 氏名       | カナ     | 性別 | 生年月日   | 電話番号       | 被害");
console.log("-".repeat(100));

const wiped = [];
for (const id of ids) {
  const r = data.find(d => d.patient_id === id);
  if (!r) continue;
  const a = r.answers || {};
  const name = (r.patient_name || "(空)").padEnd(8);
  const kana = a.カナ || a.name_kana || "";
  const sex = a.性別 || a.sex || "";
  const birth = a.生年月日 || a.birth || "";
  const tel = a.電話番号 || a.tel || "";
  const missing = [];
  if (!kana) missing.push("カナ");
  if (!sex) missing.push("性別");
  if (!birth) missing.push("生年月日");
  if (!tel) missing.push("電話番号");
  const status = missing.length > 0 ? missing.join(",") : "OK";
  console.log(`${id} | ${name} | ${(kana || "-").padEnd(8)} | ${(sex || "-").padEnd(2)} | ${(birth || "-").padEnd(10)} | ${(tel || "-").padEnd(14)} | ${status}`);
  if (missing.length > 0) wiped.push({ id, name: r.patient_name, missing });
}

console.log(`\n=== 被害あり: ${wiped.length}人 ===`);
for (const w of wiped) {
  console.log(`  ${w.id} ${w.name} → ${w.missing.join(", ")}`);
}
