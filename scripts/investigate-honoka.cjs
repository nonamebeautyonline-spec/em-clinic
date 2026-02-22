const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// .env.local読み込み
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
  // =====================================================
  // 1. patient_tags で patient_id = 'LINE_3b119cfd'
  // =====================================================
  console.log("=== 1. patient_tags: LINE_3b119cfd ===");
  const { data: tags, error: tagsErr } = await sb
    .from("patient_tags")
    .select("*")
    .eq("patient_id", "LINE_3b119cfd");
  if (tagsErr) console.log("ERROR:", tagsErr.message);
  else if (!tags || tags.length === 0) console.log("(レコードなし)");
  else tags.forEach((r) => console.log(r));

  // =====================================================
  // 2. answerers で name ILIKE '%新家%' OR '%穂花%' OR '%ほのか%'
  // =====================================================
  console.log("\n=== 2. answerers: 新家 / 穂花 / ほのか 検索 ===");
  const { data: ans1, error: ans1Err } = await sb
    .from("answerers")
    .select("*")
    .ilike("name", "%新家%");
  const { data: ans2, error: ans2Err } = await sb
    .from("answerers")
    .select("*")
    .ilike("name", "%穂花%");
  const { data: ans3, error: ans3Err } = await sb
    .from("answerers")
    .select("*")
    .ilike("name", "%ほのか%");

  const allAns = [
    ...(ans1 || []),
    ...(ans2 || []),
    ...(ans3 || []),
  ];
  // 重複排除
  const seen = new Set();
  const uniqueAns = allAns.filter((r) => {
    if (seen.has(r.id || r.patient_id)) return false;
    seen.add(r.id || r.patient_id);
    return true;
  });
  if (ans1Err) console.log("ERROR(新家):", ans1Err.message);
  if (ans2Err) console.log("ERROR(穂花):", ans2Err.message);
  if (ans3Err) console.log("ERROR(ほのか):", ans3Err.message);
  if (uniqueAns.length === 0) console.log("(レコードなし)");
  else uniqueAns.forEach((r) => console.log(r));

  // =====================================================
  // 3. intake で patient_name ILIKE '%新家%' OR '%穂花%'
  // =====================================================
  console.log("\n=== 3. intake: 新家 / 穂花 検索 ===");
  const { data: int1, error: int1Err } = await sb
    .from("intake")
    .select("id, patient_id, patient_name, line_id, reserve_id, status, created_at, updated_at")
    .ilike("patient_name", "%新家%");
  const { data: int2, error: int2Err } = await sb
    .from("intake")
    .select("id, patient_id, patient_name, line_id, reserve_id, status, created_at, updated_at")
    .ilike("patient_name", "%穂花%");

  const allInt = [...(int1 || []), ...(int2 || [])];
  const seenInt = new Set();
  const uniqueInt = allInt.filter((r) => {
    if (seenInt.has(r.id)) return false;
    seenInt.add(r.id);
    return true;
  });
  if (int1Err) console.log("ERROR(新家):", int1Err.message);
  if (int2Err) console.log("ERROR(穂花):", int2Err.message);
  if (uniqueInt.length === 0) console.log("(レコードなし)");
  else uniqueInt.forEach((r) => console.log(r));

  // =====================================================
  // 4. answerers で patient_id = '20260200701'（植本理紗子）全データ
  // =====================================================
  console.log("\n=== 4. answerers: 20260200701（植本理紗子） ===");
  const { data: uemoto, error: uemotoErr } = await sb
    .from("answerers")
    .select("*")
    .eq("patient_id", "20260200701");
  if (uemotoErr) console.log("ERROR:", uemotoErr.message);
  else if (!uemoto || uemoto.length === 0) console.log("(レコードなし)");
  else uemoto.forEach((r) => console.log(JSON.stringify(r, null, 2)));

  // =====================================================
  // 5. intake で patient_id = 'LINE_3b119cfd' 全フィールド
  // =====================================================
  console.log("\n=== 5. intake: LINE_3b119cfd 全フィールド ===");
  const { data: intFull, error: intFullErr } = await sb
    .from("intake")
    .select("*")
    .eq("patient_id", "LINE_3b119cfd");
  if (intFullErr) console.log("ERROR:", intFullErr.message);
  else if (!intFull || intFull.length === 0) console.log("(レコードなし)");
  else intFull.forEach((r) => console.log(JSON.stringify(r, null, 2)));

  // =====================================================
  // 6. answerers で patient_id = 'LINE_3b119cfd' 全データ
  // =====================================================
  console.log("\n=== 6. answerers: LINE_3b119cfd 全データ ===");
  const { data: ansLine, error: ansLineErr } = await sb
    .from("answerers")
    .select("*")
    .eq("patient_id", "LINE_3b119cfd");
  if (ansLineErr) console.log("ERROR:", ansLineErr.message);
  else if (!ansLine || ansLine.length === 0) console.log("(レコードなし)");
  else ansLine.forEach((r) => console.log(JSON.stringify(r, null, 2)));
}

main().catch(console.error);
