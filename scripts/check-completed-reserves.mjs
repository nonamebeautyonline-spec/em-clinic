import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

const completedIds = ["20260200458","20260200565","20260200582","20260200583","20260200585","20260200577","20260100110","20260200576","20260200580","20260200346"];

const { data } = await supabase.from("intake")
  .select("patient_id, patient_name, reserve_id, reserved_date, reserved_time, updated_at")
  .in("patient_id", completedIds);

console.log("=== 問診完了者の予約データ状況 ===\n");
for (const id of completedIds) {
  const r = data.find(d => d.patient_id === id);
  if (!r) { console.log(id, "| (レコードなし)"); continue; }
  const name = (r.patient_name || "(空)").padEnd(10);
  const rid = r.reserve_id || "(null)";
  const rdate = r.reserved_date ? `${r.reserved_date} ${r.reserved_time || ""}` : "(null)";
  console.log(`${r.patient_id} | ${name} | reserve: ${rid.padEnd(24)} | 予約: ${rdate}`);
}
