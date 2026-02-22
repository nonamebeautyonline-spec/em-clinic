import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const sb = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

// 全intakeのpatient_idを取得
const { data: all } = await sb.from("intake").select("patient_id, note, created_at").not("patient_id", "is", null).order("created_at", { ascending: false }).limit(5000);

const counts = {};
for (const r of all || []) {
  if (!counts[r.patient_id]) counts[r.patient_id] = [];
  counts[r.patient_id].push({ note: (r.note || "").slice(0, 50), created_at: r.created_at });
}

const dupes = Object.entries(counts).filter(([, v]) => v.length > 1);
console.log(`全intake: ${(all || []).length}件`);
console.log(`ユニークpatient_id: ${Object.keys(counts).length}件`);
console.log(`複数intakeがある患者: ${dupes.length}人\n`);

for (const [pid, records] of dupes) {
  console.log(`PID: ${pid} (${records.length}件)`);
  for (const r of records) {
    console.log(`  ${r.created_at} | ${r.note || "(note なし)"}`);
  }
}
