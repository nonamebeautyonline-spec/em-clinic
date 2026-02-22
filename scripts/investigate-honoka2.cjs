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
  const lineUid = "U03dabc044e7b04d2a695b3c33b119cfd";

  // 1. answerers でこの LINE UID を持つレコード（移行後のIDで存在してるかも）
  console.log("=== answerers: line_id =", lineUid, "===");
  const { data: ans1 } = await sb.from("answerers")
    .select("*")
    .eq("line_id", lineUid);
  console.log("件数:", ans1?.length || 0);
  (ans1 || []).forEach(r => console.log(r));

  // 2. answerers で line_user_id でも検索
  console.log("\n=== answerers: line_user_id =", lineUid, "===");
  const { data: ans2 } = await sb.from("answerers")
    .select("*")
    .eq("line_user_id", lineUid);
  console.log("件数:", ans2?.length || 0);
  (ans2 || []).forEach(r => console.log(r));

  // 3. intake テーブルでこの LINE UID を持つ全レコード（移行後IDも含む）
  console.log("\n=== intake: line_id =", lineUid, "===");
  const { data: intakes } = await sb.from("intake")
    .select("id, patient_id, patient_name, line_id, reserve_id, status, created_at, answers")
    .eq("line_id", lineUid)
    .order("created_at", { ascending: true });
  console.log("件数:", intakes?.length || 0);
  (intakes || []).forEach(r => {
    const ans = r.answers || {};
    console.log({
      id: r.id,
      patient_id: r.patient_id,
      patient_name: r.patient_name,
      reserve_id: r.reserve_id,
      status: r.status,
      created_at: r.created_at,
      has_answers: Object.keys(ans).length > 0,
      ans_name: ans.name || ans["氏名"] || null,
      ans_kana: ans.name_kana || ans["カナ"] || null,
    });
  });

  // 4. patient_tags でこの LINE UID の全PID分チェック
  const allPids = new Set();
  (ans1 || []).forEach(r => allPids.add(r.patient_id));
  (ans2 || []).forEach(r => allPids.add(r.patient_id));
  (intakes || []).forEach(r => allPids.add(r.patient_id));
  allPids.add("LINE_3b119cfd");

  console.log("\n=== patient_tags: 全関連PID ===");
  for (const pid of allPids) {
    const { data: tags } = await sb.from("patient_tags")
      .select("tag_id, assigned_by, created_at")
      .eq("patient_id", pid);
    if (tags && tags.length > 0) {
      console.log(`PID=${pid}:`, tags);
    } else {
      console.log(`PID=${pid}: タグなし`);
    }
  }

  // 5. 直近に作成されたanswerers（最新20件）で新家穂花がいないか
  console.log("\n=== answerers 最新20件 ===");
  const { data: recent } = await sb.from("answerers")
    .select("patient_id, name, name_kana, line_id, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);
  (recent || []).forEach(r => console.log(r));

  // 6. message_log でこの LINE UID 関連
  console.log("\n=== message_log: LINE_3b119cfd ===");
  const { data: msgs } = await sb.from("message_log")
    .select("id, patient_id, direction, message_type, message_text, created_at")
    .eq("patient_id", "LINE_3b119cfd")
    .order("created_at", { ascending: false })
    .limit(5);
  console.log("件数:", msgs?.length || 0);
  (msgs || []).forEach(r => console.log({...r, message_text: (r.message_text || "").substring(0, 50)}));

  // 7. friend_field_values でこのPID
  console.log("\n=== friend_field_values: LINE_3b119cfd ===");
  const { data: ffv } = await sb.from("friend_field_values")
    .select("*")
    .eq("patient_id", "LINE_3b119cfd");
  console.log("件数:", ffv?.length || 0);
  (ffv || []).forEach(r => console.log(r));
}

main().catch(console.error);
