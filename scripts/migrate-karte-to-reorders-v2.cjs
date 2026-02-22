/**
 * 既存の再処方カルテを intake → reorders.karte_note に移行（v2: 商品名マッチ対応）
 *
 * マッチ戦略:
 *   1. paid_at ±60分 (v1と同じ)
 *   2. patient_id + product_code（note内の商品名から逆引き）
 *   3. patient_id のみ（reorderが1件だけならそれに割当）
 *
 * Usage: node scripts/migrate-karte-to-reorders-v2.cjs [--dry-run]
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

// 商品名 → product_code 逆引きマップ
const PRODUCT_NAME_TO_CODE = {
  "マンジャロ 2.5mg 1ヶ月": "MJL_2.5mg_1m",
  "マンジャロ 2.5mg 2ヶ月": "MJL_2.5mg_2m",
  "マンジャロ 2.5mg 3ヶ月": "MJL_2.5mg_3m",
  "マンジャロ 5mg 1ヶ月": "MJL_5mg_1m",
  "マンジャロ 5mg 2ヶ月": "MJL_5mg_2m",
  "マンジャロ 5mg 3ヶ月": "MJL_5mg_3m",
  "マンジャロ 7.5mg 1ヶ月": "MJL_7.5mg_1m",
  "マンジャロ 7.5mg 2ヶ月": "MJL_7.5mg_2m",
  "マンジャロ 7.5mg 3ヶ月": "MJL_7.5mg_3m",
  "マンジャロ 10mg 1ヶ月": "MJL_10mg_1m",
  "マンジャロ 10mg 2ヶ月": "MJL_10mg_2m",
  "マンジャロ 10mg 3ヶ月": "MJL_10mg_3m",
};

function extractProductCode(note) {
  if (!note) return null;
  for (const [name, code] of Object.entries(PRODUCT_NAME_TO_CODE)) {
    if (note.includes(name)) return code;
  }
  return null;
}

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

  console.log(`再処方カルテ intake レコード: ${karteIntakes.length}件\n`);

  // 2. 全 paid reorder を一括取得（マッチング用）
  const { data: allReorders } = await sb
    .from("reorders")
    .select("id, patient_id, product_code, status, paid_at, karte_note, created_at")
    .eq("status", "paid")
    .order("paid_at", { ascending: false, nullsFirst: false });

  // patient_id → reorders のマップ
  const reordersByPatient = new Map();
  for (const r of allReorders || []) {
    if (!reordersByPatient.has(r.patient_id)) {
      reordersByPatient.set(r.patient_id, []);
    }
    reordersByPatient.get(r.patient_id).push({ ...r, _used: false });
  }

  let migrated = 0;
  let deleted = 0;
  let noMatch = 0;
  const unmatchedIds = [];
  const matchMethods = { time: 0, product: 0, single: 0 };

  for (const intake of karteIntakes) {
    const patientReorders = reordersByPatient.get(intake.patient_id);
    if (!patientReorders || patientReorders.length === 0) {
      noMatch++;
      continue;
    }

    const productCode = extractProductCode(intake.note);
    const karteTime = new Date(intake.created_at).getTime();

    let matched = null;
    let method = "";

    // 戦略1: paid_at ±60分マッチ + 未使用 + karte_note未設定
    for (const r of patientReorders) {
      if (r._used || r.karte_note) continue;
      if (r.paid_at) {
        const diff = Math.abs(new Date(r.paid_at).getTime() - karteTime);
        if (diff <= 60 * 60 * 1000) {
          matched = r;
          method = "time";
          break;
        }
      }
    }

    // 戦略2: patient_id + product_code マッチ + 未使用 + karte_note未設定
    if (!matched && productCode) {
      for (const r of patientReorders) {
        if (r._used || r.karte_note) continue;
        if (r.product_code === productCode) {
          matched = r;
          method = "product";
          break;
        }
      }
    }

    // 戦略3: patient_id で未使用のreorderが1件だけなら割当
    if (!matched) {
      const unused = patientReorders.filter(r => !r._used && !r.karte_note);
      if (unused.length === 1) {
        matched = unused[0];
        method = "single";
      }
    }

    if (!matched) {
      noMatch++;
      unmatchedIds.push(intake.id);
      continue;
    }

    matched._used = true;
    matchMethods[method]++;
    migrated++;

    if (!dryRun) {
      const { error: updateErr } = await sb
        .from("reorders")
        .update({ karte_note: intake.note })
        .eq("id", matched.id);

      if (updateErr) {
        console.error(`  [error] reorder#${matched.id} 更新失敗:`, updateErr);
        continue;
      }

      const { error: deleteErr } = await sb
        .from("intake")
        .delete()
        .eq("id", intake.id);

      if (deleteErr) {
        console.error(`  [error] intake#${intake.id} 削除失敗:`, deleteErr);
      } else {
        deleted++;
      }
    } else {
      deleted++;
    }
  }

  // マッチなし（重複カルテ）も intake から削除
  let dupDeleted = 0;
  if (unmatchedIds.length > 0) {
    console.log(`\n重複カルテ ${unmatchedIds.length}件を intake から削除中...`);
    for (const id of unmatchedIds) {
      if (!dryRun) {
        const { error: delErr } = await sb.from("intake").delete().eq("id", id);
        if (delErr) {
          console.error(`  [error] intake#${id} 削除失敗:`, delErr);
        } else {
          dupDeleted++;
        }
      } else {
        dupDeleted++;
      }
    }
  }

  console.log(`\n=== 結果 ===`);
  console.log(`移行成功: ${migrated}件`);
  console.log(`  内訳: 時刻マッチ=${matchMethods.time}, 商品マッチ=${matchMethods.product}, 単一マッチ=${matchMethods.single}`);
  console.log(`移行分 intake 削除: ${deleted}件`);
  console.log(`重複カルテ intake 削除: ${dupDeleted}件`);
  console.log(`合計 intake 削除: ${deleted + dupDeleted}件 / ${karteIntakes.length}件`);
  if (dryRun) console.log("(dry-run のため実際の変更はありません)");
}

main().catch(console.error);
