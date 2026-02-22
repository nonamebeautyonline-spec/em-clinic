// りさこ・ほのか・植本理紗子の個人情報/電話/問診/予約/決済を比較
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
  const PID_OLD = "20260200701";
  const PID_NEW = "20260200905";
  const RISAKO_UID = "U901eed1faa9fb4b86da8f0bf796890ac";
  const HONOKA_UID = "U03dabc044e7b04d2a695b3c33b119cfd";

  // answerers
  const { data: ans1 } = await sb.from("answerers").select("*").eq("patient_id", PID_OLD).maybeSingle();
  const { data: ans2 } = await sb.from("answerers").select("*").eq("patient_id", PID_NEW).maybeSingle();

  // intake
  const { data: intakes } = await sb.from("intake")
    .select("id, patient_id, line_id, reserve_id, answers, status, created_at")
    .or(`patient_id.eq.${PID_OLD},patient_id.eq.${PID_NEW}`)
    .order("created_at", { ascending: true });

  // reservations
  const reserveIds = (intakes || []).filter(i => i.reserve_id).map(i => i.reserve_id);
  let reserves = [];
  if (reserveIds.length > 0) {
    const { data } = await sb.from("reservations").select("*").in("reserve_id", reserveIds);
    reserves = data || [];
  }
  // patient_id でも検索
  const { data: reserves2 } = await sb.from("reservations").select("*").or(`patient_id.eq.${PID_OLD},patient_id.eq.${PID_NEW}`);
  if (reserves2) {
    for (const r of reserves2) {
      if (!reserves.find(x => x.reserve_id === r.reserve_id)) reserves.push(r);
    }
  }

  // orders
  const { data: orders1 } = await sb.from("orders").select("*").eq("patient_id", PID_OLD);
  const { data: orders2 } = await sb.from("orders").select("*").eq("patient_id", PID_NEW);

  // reorders
  const { data: reorders1 } = await sb.from("reorders").select("*").eq("patient_id", PID_OLD);
  const { data: reorders2 } = await sb.from("reorders").select("*").eq("patient_id", PID_NEW);

  // 出力
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           個人情報・問診・予約・決済 比較リスト               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│ 1. 個人情報 (answerers)                                     │");
  console.log("└─────────────────────────────────────────────────────────────┘");
  console.log(`${"項目".padEnd(14)}| PID ${PID_OLD.padEnd(20)}| PID ${PID_NEW}`);
  console.log("-".repeat(70));
  const fields = [
    ["氏名", "name"], ["カナ", "name_kana"], ["性別", "sex"],
    ["生年月日", "birthday"], ["電話番号", "tel"], ["LINE UID", "line_id"]
  ];
  for (const [label, key] of fields) {
    const v1 = ans1 ? (key === "line_id" ? "..." + (ans1[key] || "").slice(-8) : ans1[key] || "—") : "—";
    const v2 = ans2 ? (key === "line_id" ? "..." + (ans2[key] || "").slice(-8) : ans2[key] || "—") : "—";
    console.log(`${label.padEnd(14)}| ${String(v1).padEnd(24)}| ${v2}`);
  }

  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│ 2. 問診 (intake)                                            │");
  console.log("└─────────────────────────────────────────────────────────────┘");
  for (const i of (intakes || [])) {
    const a = i.answers || {};
    console.log(`\n  intake id=${i.id} | PID: ${i.patient_id} | LINE: ...${(i.line_id || "").slice(-8)} | status: ${i.status || "null"}`);
    console.log(`  作成: ${i.created_at} | 予約ID: ${i.reserve_id || "なし"}`);
    console.log(`  ─ 問診回答 ─`);
    console.log(`  氏名: ${a["氏名"] || a.name || "—"}`);
    console.log(`  カナ: ${a["カナ"] || a.name_kana || "—"}`);
    console.log(`  性別: ${a["性別"] || a.sex || "—"}`);
    console.log(`  生年月日: ${a["生年月日"] || a.birth || "—"}`);
    console.log(`  電話: ${a["電話番号"] || a.tel || "—"}`);
    console.log(`  GLP歴: ${a.glp_history || "—"} | 服薬: ${a.med_yesno || "—"} | アレルギー: ${a.allergy_yesno || "—"} | 既往歴: ${a.current_disease_yesno || "—"}`);
    console.log(`  NG判定: ${a.ng_check || "—"} | 流入: ${a.entry_route || "—"} ${a.entry_other || ""}`);
  }

  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│ 3. 予約 (reservations)                                      │");
  console.log("└─────────────────────────────────────────────────────────────┘");
  if (reserves.length === 0) {
    console.log("  なし");
  }
  for (const r of reserves) {
    console.log(`\n  予約ID: ${r.reserve_id} | PID: ${r.patient_id}`);
    console.log(`  患者名: ${r.patient_name}`);
    console.log(`  日時: ${r.reserved_date} ${r.reserved_time}`);
    console.log(`  status: ${r.status} | メニュー: ${r.prescription_menu || "—"}`);
    console.log(`  処方ノート: ${(r.note || "—").slice(0, 100)}`);
  }

  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│ 4. 決済 (orders)                                            │");
  console.log("└─────────────────────────────────────────────────────────────┘");
  const allOrders = [...(orders1 || []), ...(orders2 || [])];
  if (allOrders.length === 0) {
    console.log("  なし（両PIDとも未決済）");
  }
  for (const o of allOrders) {
    console.log(`  注文ID: ${o.id} | PID: ${o.patient_id} | ¥${o.amount} | ${o.payment_method || "—"} | ${o.status || "—"} | 決済日: ${o.paid_at || "未決済"}`);
  }

  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│ 5. 再処方 (reorders)                                        │");
  console.log("└─────────────────────────────────────────────────────────────┘");
  const allReorders = [...(reorders1 || []), ...(reorders2 || [])];
  if (allReorders.length === 0) {
    console.log("  なし");
  }
  for (const r of allReorders) {
    console.log(`  ID: ${r.id} | PID: ${r.patient_id} | status: ${r.status} | karte: ${(r.karte_note || "—").slice(0, 60)}`);
  }

  // LINE発言の電話番号との比較
  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│ 6. 電話番号の矛盾                                           │");
  console.log("└─────────────────────────────────────────────────────────────┘");
  const intake33458 = (intakes || []).find(i => i.id === 33458);
  const intakePhone = intake33458?.answers?.["電話番号"] || intake33458?.answers?.tel || "—";
  console.log(`  answerers (${PID_OLD}): ${ans1?.tel || "—"}`);
  console.log(`  answerers (${PID_NEW}): ${ans2?.tel || "—"}`);
  console.log(`  intake id=33458 問診回答: ${intakePhone}`);
  console.log(`  りさこ LINE発言: 09094385169`);
  console.log(`  ─────`);
  if (ans1?.tel === intakePhone) {
    console.log(`  ⚠️  answerers(${PID_OLD})の電話 = intake問診の電話 = 植本理紗子`);
    console.log(`      しかし LINE UID はりさこ（発言: 09094385169）→ 不一致`);
  }
  if (ans2?.tel === "09094385169") {
    console.log(`  ✓  answerers(${PID_NEW})の電話 = りさこ/ほのかの発言 = 新家穂花`);
  }
}

main().catch(console.error);
