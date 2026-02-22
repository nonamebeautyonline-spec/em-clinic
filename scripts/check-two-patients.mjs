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

for (const pid of ["20260200641", "20260200642"]) {
  console.log(`\n=== ${pid} ===`);

  const { data: ans } = await sb.from("answerers").select("*").eq("patient_id", pid).maybeSingle();
  console.log("【answerers】");
  if (ans) {
    console.log(`  ${ans.name} (${ans.name_kana}) | TEL: ${ans.tel || "未登録"} | LINE: ${ans.line_id ? "あり" : "なし"}`);
  } else {
    console.log("  (なし)");
  }

  const { data: intakes } = await sb.from("intake").select("patient_id, patient_name, line_id, line_display_name, answers, created_at").eq("patient_id", pid);
  console.log(`【intake】 ${(intakes || []).length}件`);
  for (const i of intakes || []) {
    const tel = i.answers?.tel || i.answers?.["電話番号"] || "(なし)";
    console.log(`  name=${i.patient_name} | line_id=${i.line_id ? "あり" : "なし"} | display=${i.line_display_name} | tel=${tel} | created=${i.created_at}`);
  }

  const { data: orders } = await sb.from("orders").select("id, status").eq("patient_id", pid).limit(3);
  console.log(`【orders】 ${(orders || []).length}件`);

  const { data: tags } = await sb.from("patient_tags").select("tag_id").eq("patient_id", pid);
  console.log(`【tags】 ${(tags || []).map(t => t.tag_id).join(", ") || "なし"}`);
}
