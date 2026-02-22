// 同一PIDに異なるLINE UIDのintakeがある（=cookieの持ち越しによるデータ衝突）ケースを検出
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
  // 全 intake を取得（patient_id, line_id）
  const { data: intakes, error } = await sb
    .from("intake")
    .select("id, patient_id, line_id, reserve_id, status, created_at")
    .not("line_id", "is", null);
  if (error) { console.error(error); return; }

  // patient_id ごとにユニーク line_id を集める
  const pidToUids = new Map();
  for (const row of intakes) {
    if (!row.line_id) continue;
    if (!pidToUids.has(row.patient_id)) {
      pidToUids.set(row.patient_id, new Map());
    }
    const uidMap = pidToUids.get(row.patient_id);
    if (!uidMap.has(row.line_id)) {
      uidMap.set(row.line_id, []);
    }
    uidMap.get(row.line_id).push(row);
  }

  // 複数の異なるLINE UIDを持つPIDを検出
  const collisions = [];
  for (const [pid, uidMap] of pidToUids) {
    if (uidMap.size > 1) {
      collisions.push({ patient_id: pid, uids: uidMap });
    }
  }

  console.log(`全PID数: ${pidToUids.size}`);
  console.log(`複数LINE UIDが紐づくPID: ${collisions.length}件\n`);

  // answerers を取得
  const { data: answerers } = await sb.from("answerers").select("patient_id, name, line_id");
  const ansMap = new Map();
  for (const a of answerers || []) ansMap.set(a.patient_id, a);

  // orders を取得
  const { data: orders } = await sb.from("orders").select("patient_id");
  const orderPids = new Set((orders || []).map(o => o.patient_id));

  for (const c of collisions) {
    console.log(`${"=".repeat(60)}`);
    console.log(`PID: ${c.patient_id}`);
    const ans = ansMap.get(c.patient_id);
    console.log(`answerers: ${ans ? `${ans.name} (line_id: ${ans.line_id?.slice(-8)})` : "なし"}`);
    console.log(`orders: ${orderPids.has(c.patient_id) ? "あり" : "なし"}`);

    for (const [uid, rows] of c.uids) {
      console.log(`  LINE UID: ...${uid.slice(-8)}`);
      for (const r of rows) {
        console.log(`    intake id=${r.id} reserve=${r.reserve_id || "—"} status=${r.status || "null"} ${r.created_at}`);
      }
      // このUIDの元の問診データから名前を取得
      const intakeWithAnswers = rows.find(r => r.reserve_id);
      if (intakeWithAnswers) {
        const { data: full } = await sb.from("intake").select("answers").eq("id", intakeWithAnswers.id).maybeSingle();
        if (full?.answers?.["氏名"] || full?.answers?.name) {
          console.log(`    → 問診上の氏名: ${full.answers["氏名"] || full.answers.name}`);
        }
      }
    }

    // answerers の line_id がどのUIDと一致するか
    if (ans?.line_id) {
      const matchUid = [...c.uids.keys()].find(u => u === ans.line_id);
      const otherUids = [...c.uids.keys()].filter(u => u !== ans.line_id);
      if (matchUid && otherUids.length > 0) {
        console.log(`  ⚠️  answerers は ...${ans.line_id.slice(-8)} のデータ → 他のUID分が上書きされた可能性`);
      }
    }
    console.log();
  }
}

main().catch(console.error);
