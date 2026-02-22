// intake 33458 の reserved_date, reserved_time をクリアする
// りさこ(PID 20260200701)の予約はほのか(PID 20260200905)に移動済み
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
  // 修正前の確認
  const { data: before } = await sb.from("intake")
    .select("id, patient_id, reserved_date, reserved_time, reserve_id, status")
    .eq("id", 33458)
    .maybeSingle();

  console.log("--- 修正前 (intake 33458) ---");
  console.log(JSON.stringify(before, null, 2));

  if (!before) {
    console.log("intake 33458 が見つかりません");
    return;
  }

  // reserved_date, reserved_time をクリア
  const { error } = await sb.from("intake")
    .update({ reserved_date: null, reserved_time: null })
    .eq("id", 33458);

  if (error) {
    console.error("更新エラー:", error.message);
    return;
  }

  // 修正後の確認
  const { data: after } = await sb.from("intake")
    .select("id, patient_id, reserved_date, reserved_time, reserve_id, status")
    .eq("id", 33458)
    .maybeSingle();

  console.log("\n--- 修正後 (intake 33458) ---");
  console.log(JSON.stringify(after, null, 2));

  // ほのか側 (intake 33755) の確認
  const { data: honoka } = await sb.from("intake")
    .select("id, patient_id, reserved_date, reserved_time, reserve_id, status")
    .eq("id", 33755)
    .maybeSingle();

  console.log("\n--- ほのか (intake 33755) 確認 ---");
  console.log(JSON.stringify(honoka, null, 2));
}

main().catch(console.error);
