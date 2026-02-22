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

const UEMOTO_UID = "U901eed1faa9fb4b86da8f0bf796890ac";
const SHINKE_UID = "U03dabc044e7b04d2a695b3c33b119cfd";
const PID = "20260200701";

async function printPatient(label, uid, pid) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${"=".repeat(60)}`);

  // answerers
  console.log("\n【個人情報 (answerers)】");
  const { data: ans } = await sb.from("answerers").select("*").eq("line_id", uid);
  if (ans && ans.length > 0) {
    for (const a of ans) {
      console.log(`  PID: ${a.patient_id}`);
      console.log(`  氏名: ${a.name}`);
      console.log(`  カナ: ${a.name_kana}`);
      console.log(`  性別: ${a.sex}`);
      console.log(`  生年月日: ${a.birthday}`);
      console.log(`  電話: ${a.tel}`);
      console.log(`  LINE UID: ${a.line_id}`);
      console.log(`  作成: ${a.created_at}`);
      console.log(`  更新: ${a.updated_at}`);
    }
  } else {
    console.log("  → answerers レコードなし（上書きされた可能性）");
  }

  // intake（問診）
  console.log("\n【問診 (intake)】");
  const { data: intakes } = await sb.from("intake")
    .select("id, patient_id, line_id, reserve_id, answers, status, created_at")
    .eq("line_id", uid);
  // PIDでも検索（LINE移行済みの場合）
  if (pid) {
    const { data: intakes2 } = await sb.from("intake")
      .select("id, patient_id, line_id, reserve_id, answers, status, created_at")
      .eq("patient_id", pid)
      .not("line_id", "eq", uid);
    if (intakes2) intakes.push(...intakes2);
  }
  if (intakes && intakes.length > 0) {
    for (const i of intakes) {
      console.log(`  --- intake id=${i.id} ---`);
      console.log(`  PID: ${i.patient_id}`);
      console.log(`  LINE UID: ${i.line_id}`);
      console.log(`  予約ID: ${i.reserve_id || "なし"}`);
      console.log(`  status: ${i.status || "null"}`);
      console.log(`  作成: ${i.created_at}`);
      if (i.answers) {
        const a = i.answers;
        console.log(`  問診回答:`);
        console.log(`    氏名: ${a["氏名"] || a.name || "—"}`);
        console.log(`    カナ: ${a["カナ"] || a.name_kana || "—"}`);
        console.log(`    性別: ${a["性別"] || a.sex || "—"}`);
        console.log(`    生年月日: ${a["生年月日"] || a.birth || "—"}`);
        console.log(`    電話: ${a["電話番号"] || a.tel || "—"}`);
        console.log(`    GLP歴: ${a.glp_history || "—"}`);
        console.log(`    服薬: ${a.med_yesno || "—"}`);
        console.log(`    アレルギー: ${a.allergy_yesno || "—"}`);
        console.log(`    既往歴: ${a.current_disease_yesno || "—"}`);
        console.log(`    NG判定: ${a.ng_check || "—"}`);
        console.log(`    流入経路: ${a.entry_route || "—"} ${a.entry_other || ""}`);
      } else {
        console.log(`  問診回答: なし`);
      }
    }
  } else {
    console.log("  → intake なし");
  }

  // reservations（予約）
  console.log("\n【予約 (reservations)】");
  // reserve_id を intake から取得
  const reserveIds = (intakes || []).filter(i => i.reserve_id).map(i => i.reserve_id);
  if (reserveIds.length > 0) {
    const { data: reserves } = await sb.from("reservations")
      .select("*")
      .in("reserve_id", reserveIds);
    if (reserves && reserves.length > 0) {
      for (const r of reserves) {
        console.log(`  予約ID: ${r.reserve_id}`);
        console.log(`  患者名: ${r.patient_name}`);
        console.log(`  日時: ${r.reserved_date} ${r.reserved_time}`);
        console.log(`  status: ${r.status}`);
        console.log(`  処方メニュー: ${r.prescription_menu || "—"}`);
        console.log(`  ノート: ${r.note || "—"}`);
        console.log(`  作成: ${r.created_at}`);
      }
    } else {
      console.log("  → 予約なし");
    }
  } else {
    console.log("  → 予約IDなし");
  }

  // orders（決済）
  console.log("\n【決済 (orders)】");
  const pidsToCheck = new Set();
  if (pid) pidsToCheck.add(pid);
  (intakes || []).forEach(i => pidsToCheck.add(i.patient_id));
  for (const p of pidsToCheck) {
    const { data: orders } = await sb.from("orders")
      .select("id, patient_id, amount, payment_method, status, paid_at, created_at")
      .eq("patient_id", p);
    if (orders && orders.length > 0) {
      for (const o of orders) {
        console.log(`  注文ID: ${o.id}  PID: ${o.patient_id}`);
        console.log(`  金額: ¥${o.amount}`);
        console.log(`  支払方法: ${o.payment_method || "—"}`);
        console.log(`  status: ${o.status || "—"}`);
        console.log(`  決済日: ${o.paid_at || "未決済"}`);
        console.log(`  作成: ${o.created_at}`);
      }
    } else {
      console.log(`  → orders なし (PID: ${p})`);
    }
  }

  // verify
  console.log("\n【電話認証 (verify_codes)】");
  for (const p of pidsToCheck) {
    const { data: vc } = await sb.from("verify_codes")
      .select("patient_id, verified, created_at")
      .eq("patient_id", p);
    if (vc && vc.length > 0) {
      for (const v of vc) {
        console.log(`  PID: ${v.patient_id}  verified: ${v.verified}  作成: ${v.created_at}`);
      }
    } else {
      console.log(`  → verify なし (PID: ${p})`);
    }
  }

  // patient_marks
  console.log("\n【対応マーク】");
  for (const p of pidsToCheck) {
    const { data: mk } = await sb.from("patient_marks").select("*").eq("patient_id", p).maybeSingle();
    if (mk) {
      console.log(`  PID: ${p}  mark: ${mk.mark}  updated_by: ${mk.updated_by}  updated_at: ${mk.updated_at}`);
    } else {
      console.log(`  → マークなし (PID: ${p})`);
    }
  }

  // patient_tags
  console.log("\n【タグ】");
  for (const p of pidsToCheck) {
    const { data: tags } = await sb.from("patient_tags").select("tag_id").eq("patient_id", p);
    if (tags && tags.length > 0) {
      // タグ名取得
      const { data: defs } = await sb.from("tag_definitions").select("id, name").in("id", tags.map(t => t.tag_id));
      const nameMap = new Map((defs || []).map(d => [d.id, d.name]));
      for (const t of tags) {
        console.log(`  PID: ${p}  tag: ${nameMap.get(t.tag_id) || t.tag_id}`);
      }
    } else {
      console.log(`  → タグなし (PID: ${p})`);
    }
  }
}

async function main() {
  await printPatient("植本理紗子（りさこ）— LINE UID: U901eed1f...", UEMOTO_UID, PID);
  await printPatient("新家穂花（シンヤ ホノカ）— LINE UID: U03dabc04...3b119cfd", SHINKE_UID, null);
}

main().catch(console.error);
