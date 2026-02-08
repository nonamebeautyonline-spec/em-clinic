import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

const ids = ["20260200565","20260200582","20260200583","20260200585","20260200577","20260200576","20260200580","20260200346"];

// phone_verifications / sms系テーブルを探す
const candidateTables = ["phone_verifications", "verified_phones", "sms_verifications", "otp_verifications", "patients", "users", "profiles", "members"];
for (const t of candidateTables) {
  const res = await supabase.from(t).select("*").limit(1);
  if (res.error) {
    console.log(`${t}: not found (${res.error.code})`);
  } else {
    console.log(`${t}: EXISTS - columns: ${Object.keys(res.data[0] || {}).join(", ")}`);
  }
}

console.log("\n=== answerers テーブルの電話番号 ===");
const { data: answerers } = await supabase.from("answerers").select("patient_id, name, tel").in("patient_id", ids);
for (const id of ids) {
  const r = answerers?.find(a => a.patient_id === id);
  console.log(`${id} | ${(r?.name || "(空)").padEnd(8)} | tel: ${r?.tel || "(空)"}`);
}

// intake.answersの中にreserve時の元データが残っているか確認
console.log("\n=== intake.answers内の全キー確認（1人分） ===");
const { data: sample } = await supabase.from("intake").select("answers").eq("patient_id", ids[0]).single();
console.log("20260200565 answers keys:", Object.keys(sample?.answers || {}));
