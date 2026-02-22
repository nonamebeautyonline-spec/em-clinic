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
  const pid = "LINE_3b119cfd";

  // 1. intakeテーブルで検索
  console.log("=== intake テーブル ===");
  const { data: intakes, error: e1 } = await sb
    .from("intake")
    .select("id, patient_id, patient_name, line_id, reserve_id, status, created_at, answers")
    .eq("patient_id", pid);
  if (e1) console.error("intake error:", e1.message);
  console.log("件数:", intakes?.length || 0);
  (intakes || []).forEach((r) => {
    const ans = r.answers || {};
    console.log({
      id: r.id,
      patient_id: r.patient_id,
      patient_name: r.patient_name,
      line_id: r.line_id,
      reserve_id: r.reserve_id,
      status: r.status,
      created_at: r.created_at,
      has_name: !!ans.name,
      has_phone: !!ans.phone,
      ng_check: ans.ng_check,
    });
  });

  // 2. patientsテーブルで検索
  console.log("\n=== patients テーブル ===");
  const { data: patients, error: e2 } = await sb
    .from("patients")
    .select("*")
    .eq("patient_id", pid);
  if (e2) console.error("patients error:", e2.message);
  console.log("件数:", patients?.length || 0);
  (patients || []).forEach((r) => console.log(r));

  // 3. line_idで検索（もし別PIDに紐づいてるかも）
  if (intakes && intakes.length > 0 && intakes[0].line_id) {
    const lineId = intakes[0].line_id;
    console.log("\n=== line_id で intake 検索:", lineId, "===");
    const { data: byLine } = await sb
      .from("intake")
      .select("id, patient_id, patient_name, line_id, created_at")
      .eq("line_id", lineId);
    console.log("件数:", byLine?.length || 0);
    (byLine || []).forEach((r) => console.log(r));

    console.log("\n=== line_id で patients 検索 ===");
    const { data: patByLine } = await sb
      .from("patients")
      .select("*")
      .eq("line_user_id", lineId);
    console.log("件数:", patByLine?.length || 0);
    (patByLine || []).forEach((r) => console.log(r));
  }

  // 4. reservationsで検索
  console.log("\n=== reservations テーブル ===");
  const { data: reservations, error: e3 } = await sb
    .from("reservations")
    .select("reserve_id, patient_id, patient_name, reserved_date, reserved_time, status, created_at")
    .eq("patient_id", pid);
  if (e3) console.error("reservations error:", e3.message);
  console.log("件数:", reservations?.length || 0);
  (reservations || []).forEach((r) => console.log(r));

  // 5. ordersで検索
  console.log("\n=== orders テーブル ===");
  const { data: orders, error: e4 } = await sb
    .from("orders")
    .select("id, patient_id, status, amount, payment_method, created_at")
    .eq("patient_id", pid);
  if (e4) console.error("orders error:", e4.message);
  console.log("件数:", orders?.length || 0);
  (orders || []).forEach((r) => console.log(r));
}

main().catch(console.error);
