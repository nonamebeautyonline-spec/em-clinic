// 処方済み（orders有）でpatient_marksに処方ずみマーク（red）がない患者にバックフィル
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

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  // 1) orders のユニーク patient_id
  const { data: orders, error: oErr } = await sb.from("orders").select("patient_id");
  if (oErr) { console.error("orders error:", oErr); return; }
  const orderPids = [...new Set(orders.map(o => o.patient_id))];

  // 2) patient_marks で既に red のもの
  const { data: marks, error: mErr } = await sb.from("patient_marks").select("patient_id, mark");
  if (mErr) { console.error("marks error:", mErr); return; }
  const redPids = new Set(marks.filter(m => m.mark === "red").map(m => m.patient_id));

  // 3) 対象
  const missing = orderPids.filter(pid => !redPids.has(pid));
  console.log(`対象: ${missing.length}人（処方済み but マークなし）`);

  if (missing.length === 0) {
    console.log("バックフィル不要");
    return;
  }

  if (DRY_RUN) {
    console.log("[DRY RUN] 以下のPIDにマーク red を付与予定:");
    missing.forEach(pid => console.log(`  ${pid}`));
    return;
  }

  // 4) upsert でバックフィル（50件ずつ）
  let ok = 0, ng = 0;
  const BATCH = 50;
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const rows = batch.map(pid => ({
      patient_id: pid,
      mark: "red",
      note: null,
      updated_at: new Date().toISOString(),
      updated_by: "backfill",
    }));
    const { error } = await sb.from("patient_marks").upsert(rows, { onConflict: "patient_id" });
    if (error) {
      console.error(`バッチ ${i}~${i + batch.length - 1} エラー:`, error.message);
      ng += batch.length;
    } else {
      ok += batch.length;
    }
  }
  console.log(`完了: 成功=${ok}, 失敗=${ng}`);
}

main().catch(console.error);
