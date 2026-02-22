// answerers の更新タイミングと personal-info 登録の痕跡を調査
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

const RISAKO_UID = "U901eed1faa9fb4b86da8f0bf796890ac";
const HONOKA_UID = "U03dabc044e7b04d2a695b3c33b119cfd";
const PID = "20260200701";

async function main() {
  // 1) answerers の現在の状態
  console.log("=== 1. answerers (PID: 20260200701) ===");
  const { data: ans } = await sb.from("answerers").select("*").eq("patient_id", PID).maybeSingle();
  if (ans) {
    console.log(`  name: ${ans.name} | tel: ${ans.tel} | line_id: ...${(ans.line_id || "").slice(-8)}`);
    console.log(`  created_at: ${ans.created_at}`);
    console.log(`  updated_at: ${ans.updated_at}`);
  }

  // 2) verify_codes - 電話認証があれば元の電話番号がわかる
  console.log("\n=== 2. 電話認証 (verify_codes) ===");
  const { data: vc1 } = await sb.from("verify_codes")
    .select("*")
    .eq("patient_id", PID);
  const { data: vc2 } = await sb.from("verify_codes")
    .select("*")
    .eq("patient_id", "20260200905");
  const allVc = [...(vc1 || []), ...(vc2 || [])];
  if (allVc.length > 0) {
    for (const v of allVc) console.log(`  PID: ${v.patient_id} | phone: ${v.phone || v.tel || "—"} | verified: ${v.verified} | ${v.created_at}`);
  } else {
    console.log("  → なし（両PIDとも認証なし）");
  }

  // 3) 電話番号でanswerers全体を検索
  console.log("\n=== 3. 電話番号で全answerers検索 ===");
  const { data: p1 } = await sb.from("answerers").select("patient_id, name, tel, line_id").eq("tel", "09094385169");
  console.log("  09094385169:", p1 && p1.length > 0 ? p1.map(a => `PID=${a.patient_id} ${a.name} ...${(a.line_id||"").slice(-8)}`).join(", ") : "なし");
  const { data: p2 } = await sb.from("answerers").select("patient_id, name, tel, line_id").eq("tel", "08088405581");
  console.log("  08088405581:", p2 && p2.length > 0 ? p2.map(a => `PID=${a.patient_id} ${a.name} ...${(a.line_id||"").slice(-8)}`).join(", ") : "なし");

  // 4) 2/12 17:10-17:25 JST (08:10-08:25 UTC) のイベント時系列
  console.log("\n=== 4. 2/12 17:10-17:25 JST の全イベント ===");
  const { data: msgs } = await sb.from("message_log")
    .select("id, patient_id, direction, event_type, message_type, content, sent_at")
    .or(`patient_id.eq.${PID},patient_id.eq.20260200905`)
    .gte("sent_at", "2026-02-12T08:10:00+00:00")
    .lte("sent_at", "2026-02-12T08:25:00+00:00")
    .order("sent_at", { ascending: true });
  if (msgs) {
    for (const m of msgs) {
      const d = new Date(m.sent_at);
      const jst = `${d.getUTCHours()+9}:${String(d.getUTCMinutes()).padStart(2,"0")}:${String(d.getUTCSeconds()).padStart(2,"0")}`;
      console.log(`  ${jst} | id=${m.id} | PID=${m.patient_id} | ${m.direction} ${m.event_type||m.message_type||""} | ${(m.content||"").slice(0,60)}`);
    }
  }

  // 5) りさこUID / ほのかUID で answerers 検索
  console.log("\n=== 5. LINE UID で answerers 検索 ===");
  const { data: a1 } = await sb.from("answerers").select("patient_id, name, tel").eq("line_id", RISAKO_UID);
  console.log(`  りさこ UID: ${a1 && a1.length > 0 ? a1.map(a => `PID=${a.patient_id} ${a.name} ${a.tel}`).join(", ") : "なし"}`);
  const { data: a2 } = await sb.from("answerers").select("patient_id, name, tel").eq("line_id", HONOKA_UID);
  console.log(`  ほのか UID: ${a2 && a2.length > 0 ? a2.map(a => `PID=${a.patient_id} ${a.name} ${a.tel}`).join(", ") : "なし"}`);

  // 6) intake の answers 内の電話番号
  console.log("\n=== 6. intake answers 内の電話番号 ===");
  const { data: i1 } = await sb.from("intake").select("id, answers, line_id").eq("id", 33458).maybeSingle();
  const { data: i2 } = await sb.from("intake").select("id, answers, line_id").eq("id", 33755).maybeSingle();
  console.log(`  intake 33458 (line_id=...${(i1?.line_id||"").slice(-8)}): 氏名=${i1?.answers?.["氏名"]||"—"} 電話=${i1?.answers?.["電話番号"]||"—"}`);
  console.log(`  intake 33755 (line_id=...${(i2?.line_id||"").slice(-8)}): 氏名=${i2?.answers?.["氏名"]||"—"} 電話=${i2?.answers?.["電話番号"]||"—"}`);
}

main().catch(console.error);
