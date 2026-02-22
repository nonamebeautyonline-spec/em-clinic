// 個人情報未入力なのに「個人情報入力後」メニューが表示されている人の詳細調査
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
const TOKEN = env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

async function main() {
  // 1) LINE UID を持つ患者一覧
  const { data: intakes } = await sb
    .from("intake")
    .select("patient_id, line_id, reserve_id, answers")
    .not("line_id", "is", null);

  // patient_id → { line_id, hasReserve, hasAnswers }
  const pidInfo = new Map();
  for (const row of intakes || []) {
    if (!row.line_id) continue;
    const prev = pidInfo.get(row.patient_id);
    const hasReserve = !!row.reserve_id;
    const hasAnswers = !!(row.answers && Object.keys(row.answers).length > 0);
    if (!prev) {
      pidInfo.set(row.patient_id, { line_id: row.line_id, hasReserve, hasAnswers });
    } else {
      // いずれかのレコードにあれば true
      if (hasReserve) prev.hasReserve = true;
      if (hasAnswers) prev.hasAnswers = true;
    }
  }
  console.log("LINE連携患者数:", pidInfo.size);

  // 2) answerers（個人情報）
  const { data: answerers } = await sb
    .from("answerers")
    .select("patient_id, name, tel");
  const answererMap = new Map();
  for (const a of answerers || []) {
    answererMap.set(a.patient_id, { name: a.name, tel: a.tel });
  }

  // 3) verify_codes（電話認証済み）
  const { data: verifies } = await sb
    .from("verify_codes")
    .select("patient_id, verified");
  const verifiedPids = new Set((verifies || []).filter(v => v.verified).map(v => v.patient_id));

  // 4) reservations（予約あり）
  const { data: reserves } = await sb
    .from("reservations")
    .select("patient_id");
  const reservePids = new Set((reserves || []).map(r => r.patient_id));

  // 5) orders（処方済み）
  const { data: orders } = await sb
    .from("orders")
    .select("patient_id");
  const orderPids = new Set((orders || []).map(o => o.patient_id));

  // 6) 個人情報未入力の患者を抽出
  const noInfoUsers = [];
  for (const [pid, info] of pidInfo) {
    const ans = answererMap.get(pid);
    if (!ans?.name) {
      noInfoUsers.push({ patient_id: pid, ...info, tel: ans?.tel || null });
    }
  }
  console.log("個人情報未入力:", noInfoUsers.length);

  // UID重複排除
  const uidMap = new Map();
  for (const u of noInfoUsers) {
    if (!uidMap.has(u.line_id)) uidMap.set(u.line_id, u);
  }
  const uniqueUsers = [...uidMap.values()];
  console.log("ユニークLINE UID:", uniqueUsers.length);

  // 7) メニュー定義取得
  const { data: menuDef } = await sb
    .from("rich_menus")
    .select("line_rich_menu_id, name")
    .eq("name", "個人情報入力後")
    .maybeSingle();
  if (!menuDef) { console.log("メニュー定義が見つからない"); return; }
  console.log(`\n対象メニュー: ${menuDef.name} (${menuDef.line_rich_menu_id})`);

  // 8) LINE APIでリッチメニュー確認
  const mismatch = [];
  let checked = 0;
  const BATCH = 10;

  for (let i = 0; i < uniqueUsers.length; i += BATCH) {
    const batch = uniqueUsers.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (u) => {
      try {
        const res = await fetch(`https://api.line.me/v2/bot/user/${u.line_id}/richmenu`, {
          headers: { Authorization: `Bearer ${TOKEN}` },
        });
        if (!res.ok) return { ...u, currentMenu: null };
        const data = await res.json();
        return { ...u, currentMenu: data.richMenuId };
      } catch {
        return { ...u, currentMenu: null };
      }
    }));

    for (const r of results) {
      if (r.currentMenu === menuDef.line_rich_menu_id) {
        mismatch.push(r);
      }
    }
    checked += batch.length;
    if (checked % 100 === 0) process.stdout.write(`  checked ${checked}/${uniqueUsers.length}\r`);
  }

  // 9) 集計
  let linePrefix = 0, hasVerify = 0, hasReserve = 0, hasOrder = 0, hasIntakeAnswers = 0, hasTel = 0;
  for (const m of mismatch) {
    if (m.patient_id.startsWith("LINE_")) linePrefix++;
    if (verifiedPids.has(m.patient_id)) hasVerify++;
    if (reservePids.has(m.patient_id) || m.hasReserve) hasReserve++;
    if (orderPids.has(m.patient_id)) hasOrder++;
    if (m.hasAnswers) hasIntakeAnswers++;
    if (m.tel) hasTel++;
  }

  console.log(`\n\n========== 結果 ==========`);
  console.log(`チェック済み: ${checked}人`);
  console.log(`個人情報未入力 + 個人情報入力後メニュー: ${mismatch.length}人`);
  console.log(`  うち LINE_ プレフィックス: ${linePrefix}人`);
  console.log(`  うち 数値PID: ${mismatch.length - linePrefix}人`);
  console.log(`  うち 電話認証(verify)済み: ${hasVerify}人`);
  console.log(`  うち 電話番号あり(answerers.tel): ${hasTel}人`);
  console.log(`  うち 予約あり(reservations): ${hasReserve}人`);
  console.log(`  うち 処方済み(orders): ${hasOrder}人`);
  console.log(`  うち 問診回答あり(intake.answers): ${hasIntakeAnswers}人`);

  // 10) サンプル出力（先頭20件の詳細）
  console.log(`\n--- サンプル（先頭20件）---`);
  for (const m of mismatch.slice(0, 20)) {
    const flags = [];
    if (m.patient_id.startsWith("LINE_")) flags.push("LINE_");
    if (verifiedPids.has(m.patient_id)) flags.push("verify済");
    if (reservePids.has(m.patient_id) || m.hasReserve) flags.push("予約あり");
    if (orderPids.has(m.patient_id)) flags.push("処方済");
    if (m.hasAnswers) flags.push("問診あり");
    if (m.tel) flags.push("TEL有");
    console.log(`  ${m.patient_id}  [${flags.join(", ") || "なし"}]`);
  }
}

main().catch(console.error);
