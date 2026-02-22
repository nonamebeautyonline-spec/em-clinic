// りさこ・ほのか・植本理紗子の全データ時系列比較
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

function toJST(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

async function main() {
  const PID1 = "20260200701";
  const PID2 = "20260200905";

  // answerers
  const { data: a1 } = await sb.from("answerers").select("*").eq("patient_id", PID1).maybeSingle();
  const { data: a2 } = await sb.from("answerers").select("*").eq("patient_id", PID2).maybeSingle();

  // intake
  const { data: i1 } = await sb.from("intake").select("*").eq("id", 33458).maybeSingle();
  const { data: i2 } = await sb.from("intake").select("*").eq("id", 33755).maybeSingle();

  // reservations
  const { data: reserves } = await sb.from("reservations").select("*").eq("patient_id", PID1);
  const resv = reserves && reserves.length > 0 ? reserves[0] : null;

  // orders
  const { data: o1 } = await sb.from("orders").select("*").eq("patient_id", PID1);
  const { data: o2 } = await sb.from("orders").select("*").eq("patient_id", PID2);

  // reorders
  const { data: re1 } = await sb.from("reorders").select("*").eq("patient_id", PID1);
  const { data: re2 } = await sb.from("reorders").select("*").eq("patient_id", PID2);

  // message_log: follow イベント（友だち追加タイミング）
  const { data: followMsgs } = await sb.from("message_log")
    .select("id, patient_id, direction, event_type, content, sent_at")
    .or(`patient_id.eq.${PID1},patient_id.eq.${PID2}`)
    .eq("event_type", "follow")
    .eq("direction", "incoming")
    .order("sent_at", { ascending: true });

  // message_log: 診察関連（不通メッセージ等）
  const { data: clinicMsgs } = await sb.from("message_log")
    .select("id, patient_id, direction, event_type, content, sent_at")
    .or(`patient_id.eq.${PID1},patient_id.eq.${PID2}`)
    .eq("direction", "outgoing")
    .eq("event_type", "individual")
    .order("sent_at", { ascending: true });

  const ia1 = i1?.answers || {};
  const ia2 = i2?.answers || {};

  // ============================================================
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║       個人情報・電話番号・問診・予約・診察 時系列比較リスト           ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");

  // 1. 個人情報
  console.log("\n┌──────────────────────────────────────────────────────────────────────┐");
  console.log("│ 1. 個人情報 (answerers)                                              │");
  console.log("└──────────────────────────────────────────────────────────────────────┘");
  console.log(`  ${"".padEnd(16)}| ${"PID " + PID1} (りさこ)     | PID ${PID2} (ほのか)`);
  console.log("  " + "-".repeat(70));
  console.log(`  ${"氏名".padEnd(16)}| ${(a1?.name||"—").padEnd(26)}| ${a2?.name||"—"}`);
  console.log(`  ${"カナ".padEnd(16)}| ${(a1?.name_kana||"—").padEnd(26)}| ${a2?.name_kana||"—"}`);
  console.log(`  ${"性別".padEnd(16)}| ${(a1?.sex||"—").padEnd(26)}| ${a2?.sex||"—"}`);
  console.log(`  ${"生年月日".padEnd(16)}| ${(a1?.birthday||"—").padEnd(26)}| ${a2?.birthday||"—"}`);
  console.log(`  ${"電話番号".padEnd(16)}| ${(a1?.tel||"—").padEnd(26)}| ${a2?.tel||"—"}`);
  console.log(`  ${"LINE UID".padEnd(16)}| ${"..." + (a1?.line_id||"").slice(-8).padEnd(23)}| ${"..." + (a2?.line_id||"").slice(-8)}`);
  console.log(`  ${"登録日時".padEnd(16)}| ${toJST(a1?.created_at).padEnd(26)}| ${toJST(a2?.created_at)}`);
  console.log(`  ${"更新日時".padEnd(16)}| ${toJST(a1?.updated_at).padEnd(26)}| ${toJST(a2?.updated_at)}`);

  // 2. 電話番号 (SMS認証)
  console.log("\n┌──────────────────────────────────────────────────────────────────────┐");
  console.log("│ 2. 電話番号 (SMS認証 → /register/complete で保存)                     │");
  console.log("└──────────────────────────────────────────────────────────────────────┘");
  console.log(`  ${"".padEnd(16)}| intake 33458               | intake 33755`);
  console.log("  " + "-".repeat(70));
  console.log(`  ${"intake電話".padEnd(16)}| ${(ia1["電話番号"]||ia1.tel||"—").padEnd(26)}| ${(ia2["電話番号"]||ia2.tel||"—")}`);
  console.log(`  ${"answerers電話".padEnd(16)}| ${(a1?.tel||"—").padEnd(26)}| ${a2?.tel||"—"}`);
  console.log(`  ${"LINE発言電話".padEnd(16)}| ${"09094385169 (りさこ発言)".padEnd(26)}| —`);
  console.log(`  ${"認証状態".padEnd(16)}| ${(ia1["電話番号"] ? "SMS認証済み" : "未認証").padEnd(26)}| ${(ia2["電話番号"]||ia2.tel) ? "SMS認証済み" : "未認証"}`);

  // 3. 問診 (intake)
  console.log("\n┌──────────────────────────────────────────────────────────────────────┐");
  console.log("│ 3. 問診 (intake)                                                     │");
  console.log("└──────────────────────────────────────────────────────────────────────┘");
  console.log(`  ${"".padEnd(16)}| intake 33458               | intake 33755`);
  console.log("  " + "-".repeat(70));
  console.log(`  ${"作成日時".padEnd(16)}| ${toJST(i1?.created_at).padEnd(26)}| ${toJST(i2?.created_at)}`);
  console.log(`  ${"LINE UID".padEnd(16)}| ${"..." + ((i1?.line_id||"").slice(-8)).padEnd(23)}| ${"..." + (i2?.line_id||"").slice(-8)}`);
  console.log(`  ${"PID".padEnd(16)}| ${(i1?.patient_id||"—").padEnd(26)}| ${i2?.patient_id||"—"}`);
  console.log(`  ${"status".padEnd(16)}| ${(i1?.status||"null").padEnd(26)}| ${i2?.status||"null"}`);
  console.log(`  ${"reserve_id".padEnd(16)}| ${(i1?.reserve_id||"なし").padEnd(26)}| ${i2?.reserve_id||"なし"}`);
  console.log(`  ${"氏名".padEnd(16)}| ${(ia1["氏名"]||"—").padEnd(26)}| ${ia2["氏名"]||"—"}`);
  console.log(`  ${"カナ".padEnd(16)}| ${(ia1["カナ"]||"—").padEnd(26)}| ${ia2["カナ"]||"—"}`);
  console.log(`  ${"性別".padEnd(16)}| ${(ia1["性別"]||"—").padEnd(26)}| ${ia2["性別"]||"—"}`);
  console.log(`  ${"生年月日".padEnd(16)}| ${(ia1["生年月日"]||"—").padEnd(26)}| ${ia2["生年月日"]||"—"}`);
  console.log(`  ${"電話番号".padEnd(16)}| ${(ia1["電話番号"]||"—").padEnd(26)}| ${ia2["電話番号"]||"—"}`);
  console.log(`  ${"GLP歴".padEnd(16)}| ${(ia1.glp_history||"—").padEnd(26)}| ${ia2.glp_history||"—"}`);
  console.log(`  ${"服薬".padEnd(16)}| ${(ia1.med_yesno||"—").padEnd(26)}| ${ia2.med_yesno||"—"}`);
  console.log(`  ${"アレルギー".padEnd(16)}| ${(ia1.allergy_yesno||"—").padEnd(26)}| ${ia2.allergy_yesno||"—"}`);
  console.log(`  ${"既往歴".padEnd(16)}| ${(ia1.current_disease_yesno||"—").padEnd(26)}| ${ia2.current_disease_yesno||"—"}`);
  console.log(`  ${"NG判定".padEnd(16)}| ${(ia1.ng_check||"—").padEnd(26)}| ${ia2.ng_check||"—"}`);
  console.log(`  ${"流入経路".padEnd(16)}| ${((ia1.entry_route||"—") + " " + (ia1.entry_other||"")).padEnd(26)}| ${(ia2.entry_route||"—") + " " + (ia2.entry_other||"")}`);

  // 4. 予約
  console.log("\n┌──────────────────────────────────────────────────────────────────────┐");
  console.log("│ 4. 予約 (reservations)                                               │");
  console.log("└──────────────────────────────────────────────────────────────────────┘");
  if (resv) {
    console.log(`  予約ID:       ${resv.reserve_id}`);
    console.log(`  PID:          ${resv.patient_id}`);
    console.log(`  患者名:       ${resv.patient_name}`);
    console.log(`  予約日時:     ${resv.reserved_date} ${resv.reserved_time}`);
    console.log(`  status:       ${resv.status}`);
    console.log(`  メニュー:     ${resv.prescription_menu || "—"}`);
    console.log(`  作成日時:     ${toJST(resv.created_at)}`);
    console.log(`  更新日時:     ${toJST(resv.updated_at)}`);
  } else {
    console.log("  なし");
  }
  // PID2の予約
  const { data: reserves2 } = await sb.from("reservations").select("*").eq("patient_id", PID2);
  if (reserves2 && reserves2.length > 0) {
    console.log(`  --- PID ${PID2} ---`);
    reserves2.forEach(r => console.log(`  ${r.reserve_id} ${r.reserved_date} ${r.status}`));
  } else {
    console.log(`  PID ${PID2}: 予約なし`);
  }

  // 5. 診察状況
  console.log("\n┌──────────────────────────────────────────────────────────────────────┐");
  console.log("│ 5. 診察状況                                                          │");
  console.log("└──────────────────────────────────────────────────────────────────────┘");
  if (resv?.note) {
    console.log("  処方ノート:");
    resv.note.split("\n").forEach(l => console.log("    " + l));
  }
  // patient_marks
  const { data: mk1 } = await sb.from("patient_marks").select("*").eq("patient_id", PID1).maybeSingle();
  const { data: mk2 } = await sb.from("patient_marks").select("*").eq("patient_id", PID2).maybeSingle();
  console.log(`  マーク (${PID1}): ${mk1 ? mk1.mark + " (" + toJST(mk1.updated_at) + ")" : "なし"}`);
  console.log(`  マーク (${PID2}): ${mk2 ? mk2.mark + " (" + toJST(mk2.updated_at) + ")" : "なし"}`);

  // 6. 決済
  console.log("\n┌──────────────────────────────────────────────────────────────────────┐");
  console.log("│ 6. 決済 (orders)                                                     │");
  console.log("└──────────────────────────────────────────────────────────────────────┘");
  const allOrders = [...(o1||[]), ...(o2||[])];
  if (allOrders.length === 0) {
    console.log("  両PIDとも未決済");
  } else {
    allOrders.forEach(o => console.log(`  PID=${o.patient_id} ¥${o.amount} ${o.payment_method||"—"} ${o.status||"—"} ${toJST(o.paid_at)}`));
  }

  // 7. 全イベント時系列
  console.log("\n┌──────────────────────────────────────────────────────────────────────┐");
  console.log("│ 7. 全イベント時系列                                                   │");
  console.log("└──────────────────────────────────────────────────────────────────────┘");

  const events = [];

  // follow events
  if (followMsgs) {
    followMsgs.forEach(m => {
      const who = m.content?.includes("りさこ") ? "りさこ" : m.content?.includes("ほのか") ? "ほのか" : "?";
      events.push({ time: m.sent_at, event: `友だち追加 (${who})`, detail: `msg_id=${m.id}` });
    });
  }

  // answerers created
  if (a1?.created_at) events.push({ time: a1.created_at, event: "個人情報登録 (answerers)", detail: `PID=${PID1} ${a1.name}` });
  if (a2?.created_at) events.push({ time: a2.created_at, event: "個人情報登録 (answerers)", detail: `PID=${PID2} ${a2.name}` });

  // intake created
  if (i1?.created_at) events.push({ time: i1.created_at, event: "問診作成 (intake 33458)", detail: `氏名=${ia1["氏名"]||"—"} 電話=${ia1["電話番号"]||"—"} status=${i1.status||"null"}` });
  if (i2?.created_at) events.push({ time: i2.created_at, event: "問診作成 (intake 33755)", detail: `氏名=${ia2["氏名"]||"—"} 電話=${ia2["電話番号"]||"—"} status=${i2.status||"null"}` });

  // reservation
  if (resv?.created_at) events.push({ time: resv.created_at, event: "予約作成", detail: `${resv.reserved_date} ${resv.reserved_time} ${resv.patient_name}` });
  if (resv?.updated_at && resv.updated_at !== resv.created_at) events.push({ time: resv.updated_at, event: "予約更新", detail: `status=${resv.status} menu=${resv.prescription_menu||"—"}` });

  // clinic messages (不通メッセージ等)
  if (clinicMsgs) {
    clinicMsgs.forEach(m => {
      events.push({ time: m.sent_at, event: `admin送信 (PID=${m.patient_id})`, detail: (m.content||"").slice(0, 50) });
    });
  }

  // marks
  if (mk1?.updated_at) events.push({ time: mk1.updated_at, event: "マーク設定", detail: `PID=${PID1} ${mk1.mark}` });

  // answerers updated
  if (a1?.updated_at) events.push({ time: a1.updated_at, event: "answerers更新", detail: `PID=${PID1} ${a1.name} (※修復スクリプト)` });
  if (a2?.updated_at && a2.created_at !== a2.updated_at) events.push({ time: a2.updated_at, event: "answerers更新", detail: `PID=${PID2} ${a2.name}` });

  // sort
  events.sort((a, b) => new Date(a.time) - new Date(b.time));
  for (const e of events) {
    console.log(`  ${toJST(e.time)}  ${e.event}`);
    console.log(`    → ${e.detail}`);
  }
}

main().catch(console.error);
