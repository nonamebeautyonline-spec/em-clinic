/**
 * reorders.karte_note を intake に Dr Note としてバックフィル
 * （来院履歴に表示するため）
 *
 * 既に intake に同じ note が存在する場合はスキップ（重複防止）
 *
 * Usage: node scripts/backfill-karte-to-intake.cjs [--dry-run]
 */
const { readFileSync } = require("fs");
const { resolve } = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return;
  const [key, ...vp] = t.split("=");
  if (key && vp.length > 0) {
    let v = vp.join("=").trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    envVars[key.trim()] = v;
  }
});

const sb = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);
const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== LIVE RUN ===");

  // karte_note を持つ全 reorder を取得
  const { data: reorders, error } = await sb
    .from("reorders")
    .select("id, patient_id, karte_note, approved_at, created_at")
    .not("karte_note", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("取得エラー:", error);
    return;
  }

  console.log(`karte_note を持つ reorder: ${reorders.length}件`);

  // 既存の「再処方希望」intake を取得（重複チェック用）
  const { data: existingIntakes } = await sb
    .from("intake")
    .select("patient_id, note")
    .ilike("note", "%再処方希望%");

  const existingSet = new Set();
  for (const i of existingIntakes || []) {
    existingSet.add(`${i.patient_id}::${i.note}`);
  }

  console.log(`既存の「再処方希望」intake: ${existingSet.size}件\n`);

  // patient_id → answerer 情報をキャッシュ
  const answererCache = new Map();

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const r of reorders) {
    // 重複チェック
    const key = `${r.patient_id}::${r.karte_note}`;
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  reorder#${r.id} PID=${r.patient_id} → intake insert`);
      created++;
      existingSet.add(key);
      continue;
    }

    // answerer 情報取得（キャッシュ）
    if (!answererCache.has(r.patient_id)) {
      const { data: ans } = await sb
        .from("answerers")
        .select("name, line_id")
        .eq("patient_id", r.patient_id)
        .limit(1)
        .maybeSingle();

      let name = ans?.name || "";
      let lineId = ans?.line_id || null;

      if (!name) {
        const { data: prev } = await sb
          .from("intake")
          .select("patient_name, line_id")
          .eq("patient_id", r.patient_id)
          .not("patient_name", "is", null)
          .not("patient_name", "eq", "")
          .limit(1)
          .maybeSingle();
        if (prev) {
          name = prev.patient_name || "";
          if (!lineId) lineId = prev.line_id || null;
        }
      }

      answererCache.set(r.patient_id, { name, lineId });
    }

    const info = answererCache.get(r.patient_id);
    const ts = r.approved_at || r.created_at;

    const { error: insertErr } = await sb.from("intake").insert({
      patient_id: r.patient_id,
      patient_name: info.name,
      line_id: info.lineId,
      note: r.karte_note,
      created_at: ts,
    });

    if (insertErr) {
      console.error(`  [error] reorder#${r.id}:`, insertErr);
      errors++;
    } else {
      created++;
      existingSet.add(key);
    }
  }

  console.log(`\n=== 結果 ===`);
  console.log(`intake 作成: ${created}件`);
  console.log(`重複スキップ: ${skipped}件`);
  if (errors > 0) console.log(`エラー: ${errors}件`);
  if (dryRun) console.log("(dry-run のため実際の変更はありません)");
}

main().catch(console.error);
