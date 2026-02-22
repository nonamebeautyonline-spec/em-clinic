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
  const pid1 = "LINE_3b119cfd";
  const pid2 = "20260200701";

  // LINE_3b119cfd のintake
  console.log("=== intake: LINE_3b119cfd ===");
  const { data: i1 } = await sb.from("intake").select("id, patient_id, patient_name, line_id, reserve_id, status, created_at").eq("patient_id", pid1);
  (i1 || []).forEach(r => console.log(r));

  // 20260200701 のintake
  console.log("\n=== intake: 20260200701 ===");
  const { data: i2 } = await sb.from("intake").select("id, patient_id, patient_name, line_id, reserve_id, status, created_at, answers").eq("patient_id", pid2);
  (i2 || []).forEach(r => {
    const ans = r.answers || {};
    console.log({
      id: r.id,
      patient_id: r.patient_id,
      patient_name: r.patient_name,
      line_id: r.line_id,
      reserve_id: r.reserve_id,
      status: r.status,
      created_at: r.created_at,
      ans_name: ans.name,
      ans_phone: ans.phone,
      ng_check: ans.ng_check,
    });
  });

  // 20260200701 のanswerers
  console.log("\n=== answerers: 20260200701 ===");
  const { data: a2 } = await sb.from("answerers").select("*").eq("patient_id", pid2);
  (a2 || []).forEach(r => console.log(r));

  // LINE_3b119cfd のanswerers
  console.log("\n=== answerers: LINE_3b119cfd ===");
  const { data: a1 } = await sb.from("answerers").select("*").eq("patient_id", pid1);
  (a1 || []).forEach(r => console.log(r));

  // 20260200701 のreservations
  console.log("\n=== reservations: 20260200701 ===");
  const { data: r2 } = await sb.from("reservations").select("reserve_id, patient_id, reserved_date, reserved_time, status, created_at").eq("patient_id", pid2);
  (r2 || []).forEach(r => console.log(r));

  // 20260200701 のorders
  console.log("\n=== orders: 20260200701 ===");
  const { data: o2 } = await sb.from("orders").select("id, patient_id, status, amount, created_at").eq("patient_id", pid2);
  (o2 || []).forEach(r => console.log(r));

  // マイページAPI: patient_idの決定ロジック確認用 — line_user_idでcookieが20260200701にセットされるか
  // LINE callback でline_idからpatient_idを検索する箇所を再現
  const lineUid = "U03dabc044e7b04d2a695b3c33b119cfd";
  console.log("\n=== line_id で intake 検索（PID特定ロジック再現）===");
  const { data: byLine } = await sb.from("intake")
    .select("patient_id, patient_name, line_id, created_at")
    .eq("line_id", lineUid)
    .order("created_at", { ascending: false });
  console.log("結果:", byLine);

  // answerers テーブルで line_id 検索
  console.log("\n=== answerers で line_user_id 検索 ===");
  const { data: ansLine } = await sb.from("answerers")
    .select("patient_id, name, tel, line_user_id")
    .eq("line_user_id", lineUid);
  console.log("結果:", ansLine);
}

main().catch(console.error);
