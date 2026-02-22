/**
 * reservations テーブルで patient_name が null のレコードを
 * intake テーブルの patient_name で埋めるスクリプト
 *
 * Usage: node scripts/fix-null-patient-name.cjs [--dry-run]
 */
const { readFileSync } = require("fs");
const { resolve } = require("path");
const { createClient } = require("@supabase/supabase-js");

// .env.local 読み込み
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
  console.log(`=== reservations patient_name null 修復 ${dryRun ? "(dry-run)" : ""} ===\n`);

  // 1. patient_name が null の reservations を全取得
  const { data: nullRows, error: fetchErr } = await sb
    .from("reservations")
    .select("id, patient_id, patient_name, reserved_date, reserved_time")
    .is("patient_name", null);

  if (fetchErr) {
    console.error("reservations 取得エラー:", fetchErr.message);
    process.exit(1);
  }

  console.log(`patient_name が null の予約: ${nullRows.length} 件\n`);

  if (nullRows.length === 0) {
    console.log("修復対象なし。終了します。");
    return;
  }

  let fixed = 0;
  let skipped = 0;

  for (const row of nullRows) {
    // 2. intake から patient_name を取得（最新レコード優先）
    const { data: intakeRows, error: intakeErr } = await sb
      .from("intake")
      .select("patient_name")
      .eq("patient_id", row.patient_id)
      .not("patient_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (intakeErr) {
      console.error(`  [ERROR] intake 取得失敗 (reservation=${row.id}):`, intakeErr.message);
      skipped++;
      continue;
    }

    const name = intakeRows?.[0]?.patient_name;
    if (!name) {
      console.log(`  [SKIP] reservation=${row.id} patient_id=${row.patient_id} → intake に patient_name なし`);
      skipped++;
      continue;
    }

    console.log(`  [FIX] reservation=${row.id} date=${row.reserved_date} ${row.reserved_time} → "${name}"`);

    if (!dryRun) {
      // 3. reservations を UPDATE
      const { error: updateErr } = await sb
        .from("reservations")
        .update({ patient_name: name })
        .eq("id", row.id);

      if (updateErr) {
        console.error(`    UPDATE エラー:`, updateErr.message);
        skipped++;
        continue;
      }
    }

    fixed++;
  }

  console.log(`\n=== 結果 ===`);
  console.log(`修復${dryRun ? "予定" : "完了"}: ${fixed} 件`);
  console.log(`修復できず（intakeにデータなし等）: ${skipped} 件`);
}

main().catch((e) => {
  console.error("予期せぬエラー:", e);
  process.exit(1);
});
