/**
 * 既存の再処方カルテを intake テーブルから reorders.karte_note に移行
 *
 * 対象: intake テーブルで note に「再処方決済」を含み、answers が空 or null のレコード
 * 処理:
 *   1. 該当 intake レコードを取得
 *   2. 同じ patient_id + 時刻が近い reorder を特定
 *   3. reorders.karte_note に intake.note を移行
 *   4. intake レコードを削除
 *
 * Usage: node scripts/migrate-karte-to-reorders.cjs [--dry-run]
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

  // 1. intake から「再処方決済」のカルテレコードを取得
  const { data: karteIntakes, error: fetchErr } = await sb
    .from("intake")
    .select("id, patient_id, note, created_at")
    .ilike("note", "%再処方決済%")
    .order("created_at", { ascending: false });

  if (fetchErr) {
    console.error("intake取得エラー:", fetchErr);
    return;
  }

  console.log(`再処方カルテ intake レコード: ${karteIntakes.length}件`);

  let migrated = 0;
  let deleted = 0;
  let skipped = 0;

  for (const intake of karteIntakes) {
    const karteTime = new Date(intake.created_at);
    // カルテ created_at は paid_at - 15分 で作られているので、±60分の範囲で reorder を探す
    const searchFrom = new Date(karteTime.getTime() - 60 * 60 * 1000).toISOString();
    const searchTo = new Date(karteTime.getTime() + 60 * 60 * 1000).toISOString();

    const { data: matchingReorders } = await sb
      .from("reorders")
      .select("id, product_code, status, paid_at, karte_note")
      .eq("patient_id", intake.patient_id)
      .eq("status", "paid")
      .gte("paid_at", searchFrom)
      .lte("paid_at", searchTo)
      .limit(1);

    if (!matchingReorders || matchingReorders.length === 0) {
      // paid_atで見つからない場合、product_codeから推測
      console.log(`  [skip] intake#${intake.id} (PID=${intake.patient_id}): 対応するreorderが見つかりません`);
      skipped++;
      continue;
    }

    const reorder = matchingReorders[0];

    if (reorder.karte_note) {
      console.log(`  [skip] intake#${intake.id} → reorder#${reorder.id}: 既にkarte_noteあり`);
      skipped++;
      continue;
    }

    console.log(`  [migrate] intake#${intake.id} → reorder#${reorder.id} (PID=${intake.patient_id})`);

    if (!dryRun) {
      // reorders.karte_note に移行
      const { error: updateErr } = await sb
        .from("reorders")
        .update({ karte_note: intake.note })
        .eq("id", reorder.id);

      if (updateErr) {
        console.error(`    reorder更新エラー:`, updateErr);
        continue;
      }
      migrated++;

      // intake レコードを削除
      const { error: deleteErr } = await sb
        .from("intake")
        .delete()
        .eq("id", intake.id);

      if (deleteErr) {
        console.error(`    intake削除エラー:`, deleteErr);
      } else {
        deleted++;
      }
    } else {
      migrated++;
      deleted++;
    }
  }

  console.log(`\n=== 結果 ===`);
  console.log(`移行: ${migrated}件`);
  console.log(`削除: ${deleted}件`);
  console.log(`スキップ: ${skipped}件`);
  if (dryRun) console.log("(dry-run のため実際の変更はありません)");
}

main().catch(console.error);
