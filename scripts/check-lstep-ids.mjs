import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return;
  const idx = trimmed.indexOf("=");
  if (idx > 0) {
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

// 未マッチの代表的なID
const testIds = ["227427247", "227875119", "227897900", "227924307", "227939430", "227950049", "227951942"];

console.log("=== answerers テーブル検索 ===");
for (const id of testIds) {
  const { data: byAnswererId } = await supabase.from("answerers").select("patient_id, answerer_id, name").eq("answerer_id", id).maybeSingle();
  const { data: byPatientId } = await supabase.from("answerers").select("patient_id, answerer_id, name").eq("patient_id", id).maybeSingle();
  console.log(`  ${id}: answerer_id=${byAnswererId ? JSON.stringify(byAnswererId) : "なし"} | patient_id=${byPatientId ? JSON.stringify(byPatientId) : "なし"}`);
}

console.log("\n=== intake テーブル検索 ===");
for (const id of testIds) {
  const { data: byAnswererId } = await supabase.from("intake").select("patient_id, answerer_id, patient_name").eq("answerer_id", id).maybeSingle();
  const { data: byPatientId } = await supabase.from("intake").select("patient_id, answerer_id, patient_name").eq("patient_id", id).maybeSingle();
  console.log(`  ${id}: answerer_id=${byAnswererId ? JSON.stringify(byAnswererId) : "なし"} | patient_id=${byPatientId ? JSON.stringify(byPatientId) : "なし"}`);
}

// answerers の answerer_id の形式を確認
console.log("\n=== answerers.answerer_id サンプル ===");
const { data: samples } = await supabase.from("answerers").select("patient_id, answerer_id").order("created_at", { ascending: false }).limit(10);
for (const s of samples) {
  console.log(`  patient_id=${s.patient_id}  answerer_id=${s.answerer_id}`);
}

// intake の answerer_id の形式を確認
console.log("\n=== intake.answerer_id サンプル ===");
const { data: intakeSamples } = await supabase.from("intake").select("patient_id, answerer_id").order("created_at", { ascending: false }).limit(10);
for (const s of intakeSamples) {
  console.log(`  patient_id=${s.patient_id}  answerer_id=${s.answerer_id}`);
}
