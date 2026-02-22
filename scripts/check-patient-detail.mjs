// 特定患者の全テーブル情報を確認
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

const pid = "20260200109";

const { data: ans } = await sb.from("answerers").select("*").eq("patient_id", pid).maybeSingle();
console.log("【answerers】", JSON.stringify(ans, null, 2));

const { data: intake } = await sb.from("intake").select("*").eq("patient_id", pid);
console.log("\n【intake】", JSON.stringify(intake, null, 2));

const { data: orders } = await sb.from("orders").select("id, status, product_code, created_at").eq("patient_id", pid).order("created_at", { ascending: false }).limit(5);
console.log("\n【orders】", JSON.stringify(orders, null, 2));

const { data: msgs } = await sb.from("message_log").select("direction, content, event_type, sent_at").eq("patient_id", pid).order("sent_at", { ascending: false }).limit(10);
console.log("\n【message_log】", JSON.stringify(msgs, null, 2));

// line_idがあればそれでintakeも探す
if (ans?.line_id) {
  const { data: byLine } = await sb.from("intake").select("patient_id, patient_name, line_id").eq("line_id", ans.line_id);
  console.log("\n【intake by line_id】", JSON.stringify(byLine, null, 2));
}

const { data: tags } = await sb.from("patient_tags").select("tag_id").eq("patient_id", pid);
console.log("\n【tags】", JSON.stringify(tags, null, 2));
