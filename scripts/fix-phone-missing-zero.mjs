// answerers.tel / orders.phone の電話番号を正規化
// - 先頭0欠落 (90... → 090...)
// - 81国際プレフィックス (819012345678 → 09012345678)
// 使い方:
//   node scripts/fix-phone-missing-zero.mjs          → ドライラン
//   node scripts/fix-phone-missing-zero.mjs --exec   → 実行
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);
const dryRun = !process.argv.includes("--exec");

console.log(dryRun ? "=== ドライラン（--exec で実行） ===" : "=== 本番実行 ===");

// lib/phone.ts と同じロジック
function normalizeJPPhone(raw) {
  const s = (raw || "").trim();
  if (!s) return "";
  let digits = s.replace(/[^\d]/g, "");
  if (!digits) return "";

  // 0080/0090/0070 → 080/090/070
  if (digits.startsWith("0080")) {
    digits = "080" + digits.slice(4);
  } else if (digits.startsWith("0090")) {
    digits = "090" + digits.slice(4);
  } else if (digits.startsWith("0070")) {
    digits = "070" + digits.slice(4);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(1);
  }

  // 81国際プレフィックス除去
  if (digits.startsWith("81") && digits.length >= 11) {
    digits = digits.slice(2);
    if (!digits.startsWith("0")) {
      digits = "0" + digits;
    }
  }

  // 先頭0なし & 7/8/9始まり → 0追加
  if (!digits.startsWith("0") && /^[789]/.test(digits)) {
    digits = "0" + digits;
  }

  return digits;
}

async function fixTable(table, column) {
  console.log(`\n--- ${table}.${column} ---`);

  // 0以外で始まる番号（7,8,9始まり＝先頭0欠落 or 81国際プレフィックス）
  const results = [];
  for (const prefix of ["7", "8", "9"]) {
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${column}, ${table === "answerers" ? "name" : "patient_id"}`)
      .like(column, `${prefix}%`)
      .limit(10000);
    if (error) {
      console.error(`  エラー (${prefix}%):`, error.message);
      continue;
    }
    if (data) results.push(...data);
  }

  console.log(`対象: ${results.length}件`);

  let fixed = 0;
  let skipped = 0;
  for (const row of results) {
    const before = row[column];
    const after = normalizeJPPhone(before);
    const label = table === "answerers" ? row.name : row.patient_id;

    if (before === after) {
      skipped++;
      continue;
    }

    if (!after.startsWith("0")) {
      console.warn(`  ⚠ スキップ (0始まりにならない): ${before} → ${after} [${label}]`);
      skipped++;
      continue;
    }

    if (fixed < 15) {
      console.log(`  ${before} → ${after}  [${label}]`);
    }

    if (!dryRun) {
      const { error } = await supabase
        .from(table)
        .update({ [column]: after })
        .eq("id", row.id);
      if (error) console.error(`  ✗ ${row.id}: ${error.message}`);
    }
    fixed++;
  }

  if (fixed > 15) console.log(`  ... 他 ${fixed - 15}件`);
  console.log(`${table}修正: ${fixed}件, スキップ: ${skipped}件`);
  return fixed;
}

const a = await fixTable("answerers", "tel");
const o = await fixTable("orders", "phone");

console.log(`\n合計: answerers ${a}件, orders ${o}件`);
console.log(dryRun ? "✅ ドライラン完了。--exec で本番実行してください" : "✅ 修正完了");
