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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const PATIENT_ID = "20251200554";

// 現在のデータ確認
const { data: before, error: fetchErr } = await supabase
  .from("intake")
  .select("id, patient_id, patient_name, status, prescription_menu, note, reserve_id")
  .eq("patient_id", PATIENT_ID);

if (fetchErr) { console.error("取得エラー:", fetchErr.message); process.exit(1); }
if (!before || before.length === 0) { console.error("該当患者なし"); process.exit(1); }

console.log("=== 更新前 ===");
for (const r of before) {
  console.log(`  id=${r.id} name=${r.patient_name} status=${r.status} menu=${r.prescription_menu}`);
  console.log(`  note: ${r.note || "(なし)"}`);
}

// 最新のintakeレコードを更新（複数ある場合はidが最大のもの）
const target = before.sort((a, b) => b.id - a.id)[0];

const noteText = `2026年12月27日
使用中
嘔気・嘔吐や低血糖に関する副作用の説明を行った。
使用方法に関して説明を実施し、パンフレットの案内を行った。
以上より上記の用量の処方を行う方針とした。`;

const { error: updateErr } = await supabase
  .from("intake")
  .update({
    status: "OK",
    prescription_menu: "5mg",
    note: noteText,
  })
  .eq("id", target.id);

if (updateErr) { console.error("更新エラー:", updateErr.message); process.exit(1); }

// reservationsも同期更新
if (target.reserve_id) {
  await supabase
    .from("reservations")
    .update({
      status: "OK",
      prescription_menu: "5mg",
      note: noteText,
    })
    .eq("reserve_id", target.reserve_id);
}

// 確認
const { data: after } = await supabase
  .from("intake")
  .select("id, patient_name, status, prescription_menu, note")
  .eq("id", target.id)
  .single();

console.log("\n=== 更新後 ===");
console.log(`  id=${after.id} name=${after.patient_name}`);
console.log(`  status: ${after.status}`);
console.log(`  prescription_menu: ${after.prescription_menu}`);
console.log(`  note: ${after.note}`);
