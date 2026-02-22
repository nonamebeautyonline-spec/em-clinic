const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((l) => {
  const t = l.trim();
  if (!t || t.startsWith("#")) return;
  const i = t.indexOf("=");
  if (i === -1) return;
  let v = t.substring(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.substring(0, i).trim()] = v;
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("=== PID 20260200701 ===");
  const { data: ans1 } = await sb.from("answerers").select("*").eq("patient_id", "20260200701").maybeSingle();
  console.log("answerers:", JSON.stringify(ans1, null, 2));

  const { data: intk1 } = await sb.from("intake").select("id, patient_id, line_id, reserve_id, created_at, status").eq("patient_id", "20260200701");
  console.log("intake:", JSON.stringify(intk1, null, 2));

  const { data: mark1 } = await sb.from("patient_marks").select("*").eq("patient_id", "20260200701").maybeSingle();
  console.log("mark:", JSON.stringify(mark1, null, 2));

  const { data: tags1 } = await sb.from("patient_tags").select("tag_id").eq("patient_id", "20260200701");
  console.log("tags:", JSON.stringify(tags1, null, 2));

  console.log("\n=== PID LINE_3b119cfd ===");
  const { data: ans2 } = await sb.from("answerers").select("*").eq("patient_id", "LINE_3b119cfd").maybeSingle();
  console.log("answerers:", JSON.stringify(ans2, null, 2));

  const { data: intk2 } = await sb.from("intake").select("id, patient_id, line_id, reserve_id, created_at, status").eq("patient_id", "LINE_3b119cfd");
  console.log("intake:", JSON.stringify(intk2, null, 2));

  // ほのかのLINE UID でintake逆引き
  const uid = "U6dcc734c42e364beac578141be3a1312";
  const { data: byLine } = await sb.from("intake").select("id, patient_id, line_id, created_at").eq("line_id", uid);
  console.log("\nintake by line_id:", JSON.stringify(byLine, null, 2));

  // 20260200701 の message_log 直近
  const { data: msgs } = await sb.from("message_log").select("id, patient_id, direction, content, created_at").eq("patient_id", "20260200701").order("created_at", { ascending: false }).limit(5);
  console.log("\nmessage_log (20260200701) 直近5件:", JSON.stringify(msgs, null, 2));
}

main().catch(console.error);
