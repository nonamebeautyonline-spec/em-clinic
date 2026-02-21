// scripts/cleanup-dup-line-id.cjs
// 同一 line_id で複数の patients レコードが存在するデータをクリーンアップ
// 使い方:
//   node scripts/cleanup-dup-line-id.cjs --dry-run   # 影響確認のみ
//   node scripts/cleanup-dup-line-id.cjs --execute    # 実行

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MERGE_TABLES = [
  "reservations", "orders", "reorders",
  "message_log", "patient_tags", "patient_marks", "friend_field_values",
];

const isDryRun = process.argv.includes("--dry-run");
const isExecute = process.argv.includes("--execute");

if (!isDryRun && !isExecute) {
  console.log("使い方: node scripts/cleanup-dup-line-id.cjs --dry-run | --execute");
  process.exit(1);
}

async function main() {
  console.log(`=== LINE ID 重複クリーンアップ (${isDryRun ? "DRY RUN" : "EXECUTE"}) ===\n`);

  // 1. 重複 line_id を検索
  const { data: allPatients, error } = await sb
    .from("patients")
    .select("patient_id, line_id, name, name_kana, tel, created_at")
    .not("line_id", "is", null)
    .order("line_id")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("patients 取得エラー:", error.message);
    process.exit(1);
  }

  // line_id でグルーピング
  const groups = {};
  for (const p of allPatients) {
    if (!groups[p.line_id]) groups[p.line_id] = [];
    groups[p.line_id].push(p);
  }

  const dupGroups = Object.entries(groups).filter(([, pats]) => pats.length > 1);

  if (dupGroups.length === 0) {
    console.log("重複 line_id はありません。クリーンアップ不要です。");
    return;
  }

  console.log(`重複 line_id グループ数: ${dupGroups.length}\n`);

  let mergedCount = 0;
  let skippedCount = 0;
  let manualCount = 0;

  for (const [lineId, patients] of dupGroups) {
    const proper = patients.filter(p => !p.patient_id.startsWith("LINE_"));
    const fakes = patients.filter(p => p.patient_id.startsWith("LINE_"));

    console.log(`\n--- line_id: ${lineId.slice(-8)} ---`);
    console.log(`  正規: ${proper.map(p => `${p.patient_id}(${p.name || "名前なし"})`).join(", ") || "なし"}`);
    console.log(`  仮ID: ${fakes.map(p => `${p.patient_id}(${p.name || "名前なし"})`).join(", ") || "なし"}`);

    if (proper.length === 0) {
      // LINE_仮レコードのみ → 最古を残して他を削除
      const keep = fakes[0];
      const toDelete = fakes.slice(1);
      console.log(`  → 最古の仮レコード ${keep.patient_id} を残し、${toDelete.length}件を削除`);

      if (isExecute) {
        for (const fake of toDelete) {
          await mergeAndDelete(fake.patient_id, keep.patient_id, lineId);
        }
      }
      mergedCount += toDelete.length;

    } else if (proper.length === 1) {
      // 正規1つ + LINE_仮レコード → 正規に統合して仮を削除
      const target = proper[0];
      console.log(`  → 正規 ${target.patient_id} に統合し、${fakes.length}件の仮レコードを削除`);

      if (isExecute) {
        for (const fake of fakes) {
          await mergeAndDelete(fake.patient_id, target.patient_id, lineId);
        }
      }
      mergedCount += fakes.length;

    } else {
      // 正規同士の重複 → 手動対応
      console.log(`  ⚠️ 正規レコード同士の重複（${proper.length}件）→ 手動対応が必要`);
      for (const p of proper) {
        console.log(`    ${p.patient_id} | ${p.name || "名前なし"} | ${p.tel || "TELなし"} | ${p.created_at}`);
      }
      // LINE_仮レコードがあれば最初の正規に統合
      if (fakes.length > 0 && isExecute) {
        for (const fake of fakes) {
          await mergeAndDelete(fake.patient_id, proper[0].patient_id, lineId);
        }
        mergedCount += fakes.length;
      }
      manualCount++;
    }
  }

  console.log(`\n=== 結果 ===`);
  console.log(`マージ・削除対象: ${mergedCount}件`);
  console.log(`手動対応が必要: ${manualCount}件`);
  if (isDryRun) {
    console.log(`\n※ DRY RUN のためデータは変更されていません。`);
    console.log(`  実行するには: node scripts/cleanup-dup-line-id.cjs --execute`);
  }
}

async function mergeAndDelete(fromPid, toPid, lineId) {
  console.log(`    マージ: ${fromPid} → ${toPid}`);

  // 関連テーブルの patient_id を付け替え
  for (const table of MERGE_TABLES) {
    const { data, error } = await sb
      .from(table)
      .update({ patient_id: toPid })
      .eq("patient_id", fromPid)
      .select("id");

    if (error && error.code !== "23505") {
      console.error(`    ${table} マージエラー:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`    ${table}: ${data.length}件を移行`);
    }
  }

  // intake は削除（正規側に既にあるため）
  const { data: intakeData } = await sb
    .from("intake")
    .select("id")
    .eq("patient_id", fromPid);
  if (intakeData && intakeData.length > 0) {
    await sb.from("intake").delete().eq("patient_id", fromPid);
    console.log(`    intake: ${intakeData.length}件を削除`);
  }

  // 仮患者レコードを削除
  const { error: delError } = await sb
    .from("patients")
    .delete()
    .eq("patient_id", fromPid);
  if (delError) {
    console.error(`    patients 削除エラー:`, delError.message);
  } else {
    console.log(`    patients: ${fromPid} を削除`);
  }
}

main().catch(console.error);
