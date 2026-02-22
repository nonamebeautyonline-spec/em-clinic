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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);
const pid = process.argv[2] || "20260200164";

console.log(`=== 患者 ${pid} のLINE ID調査 ===\n`);

// answerers
const { data: ans } = await supabase.from("answerers").select("*").eq("patient_id", pid).maybeSingle();
console.log("answerers:", ans ? { line_id: ans.line_id, name: ans.name, tel: ans.tel } : "レコードなし");

// intake
const { data: intakes } = await supabase.from("intake").select("id, patient_id, line_id, patient_name, answers").eq("patient_id", pid).order("id", { ascending: false }).limit(3);
for (const i of intakes || []) {
  const answers = i.answers || {};
  console.log(`intake[${i.id}]:`, { line_id: i.line_id, patient_name: i.patient_name, answers_line_id: answers.line_id || null });
}

// message_log（LINE UIDが使われているか）
const { data: msgs, count } = await supabase.from("message_log").select("line_user_id", { count: "exact", head: false }).eq("patient_id", pid).limit(3);
console.log(`message_log: ${count}件`, msgs?.map(m => m.line_user_id) || []);

// friend_field_values（LINEフレンド情報）
const { data: ffv } = await supabase.from("friend_field_values").select("line_user_id").eq("patient_id", pid).limit(1);
console.log("friend_field_values:", ffv?.map(f => f.line_user_id) || []);
