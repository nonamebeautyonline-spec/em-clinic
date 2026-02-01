import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== Intakeテーブルの予約情報を修正 ===\n");

const fixes = [
  { patient_id: "20260101576", reserve_id: "resv-1769700832432", date: "2026-01-30", time: "16:30:00" },
  { patient_id: "20260100211", reserve_id: "resv-1769732917014", date: "2026-01-30", time: "16:45:00" },
];

let success = 0;
let errors = 0;

for (const fix of fixes) {
  console.log(`patient_id: ${fix.patient_id}`);
  console.log(`  ${fix.date} ${fix.time} (${fix.reserve_id})`);
  
  const { error } = await supabase
    .from("intake")
    .update({
      reserve_id: fix.reserve_id,
      reserved_date: fix.date,
      reserved_time: fix.time,
    })
    .eq("patient_id", fix.patient_id);
  
  if (error) {
    console.error(`  ❌ エラー:`, error);
    errors++;
  } else {
    console.log(`  ✓ 更新完了`);
    success++;
  }
  console.log();
}

console.log("=== 修正完了 ===");
console.log(`成功: ${success}件`);
console.log(`エラー: ${errors}件`);
