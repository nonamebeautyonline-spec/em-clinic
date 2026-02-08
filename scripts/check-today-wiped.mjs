import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

// 今日(2/8)に更新されたintakeレコードを全取得
const today = "2026-02-08T00:00:00+09:00";
const { data, error } = await supabase
  .from("intake")
  .select("patient_id, patient_name, answers, updated_at, created_at, reserved_date")
  .gte("updated_at", today)
  .order("updated_at", { ascending: false });

if (error) { console.error(error); process.exit(1); }

console.log(`=== 今日(2/8)更新されたintakeレコード: ${data.length}件 ===\n`);
console.log("patient_id   | 氏名       | カナ     | 性別 | 生年月日   | 電話番号       | ng_check | 状態");
console.log("-".repeat(110));

let wiped = [];
for (const r of data) {
  const a = r.answers || {};
  const kana = a.カナ || a.name_kana || "";
  const sex = a.性別 || a.sex || "";
  const birth = a.生年月日 || a.birth || "";
  const tel = a.電話番号 || a.tel || "";
  const ng = a.ng_check || "";
  const missing = [];
  if (!kana) missing.push("カナ");
  if (!sex) missing.push("性別");
  if (!birth) missing.push("生年月日");
  if (!tel) missing.push("電話番号");
  const status = missing.length > 0 ? missing.join(",") : "OK";
  const name = (r.patient_name || "(空)").padEnd(8);
  console.log(`${r.patient_id} | ${name} | ${(kana || "-").padEnd(8)} | ${(sex || "-").padEnd(2)} | ${(birth || "-").toString().substring(0, 10).padEnd(10)} | ${(tel || "-").padEnd(14)} | ${(ng || "-").padEnd(8)} | ${status}`);
  if (missing.length > 0 && ng) wiped.push({ id: r.patient_id, name: r.patient_name, missing });
}

console.log(`\n=== 問診完了済みで個人情報欠損: ${wiped.length}人 ===`);
for (const w of wiped) {
  console.log(`  ${w.id} ${w.name || "(空)"} → ${w.missing.join(", ")}`);
}
