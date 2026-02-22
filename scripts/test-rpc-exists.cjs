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
  // create_reservation_atomic テスト
  const r1 = await sb.rpc("create_reservation_atomic", {
    p_reserve_id: "test-rpc-check",
    p_patient_id: "test",
    p_patient_name: "test",
    p_reserved_date: "2099-01-01",
    p_reserved_time: "09:00",
    p_doctor_id: "dr_default",
  });
  console.log("create_reservation_atomic:", r1.error ? "ERROR: " + r1.error.message : "OK: " + JSON.stringify(r1.data));

  // cleanup
  if (r1.data && r1.data.ok) {
    await sb.from("reservations").delete().eq("reserve_id", "test-rpc-check");
    console.log("cleanup done");
  }

  // update_reservation_atomic テスト
  const r2 = await sb.rpc("update_reservation_atomic", {
    p_reserve_id: "nonexistent",
    p_new_date: "2099-01-02",
    p_new_time: "10:00",
    p_doctor_id: "dr_default",
  });
  console.log("update_reservation_atomic:", r2.error ? "ERROR: " + r2.error.message : "OK: " + JSON.stringify(r2.data));
}

main().catch(console.error);
