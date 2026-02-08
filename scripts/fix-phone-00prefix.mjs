// orders.phone / answerers.tel の「00」プレフィックスを一括修正
// 使い方:
//   node scripts/fix-phone-00prefix.mjs          → ドライラン（確認のみ）
//   node scripts/fix-phone-00prefix.mjs --exec   → 実行
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

// --------------------------------------------------------
// 正規化関数（lib/phone.ts と同じロジック）
// --------------------------------------------------------
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
  }
  // その他の00プレフィックス → 先頭の0を1つ除去
  else if (digits.startsWith("00")) {
    digits = digits.slice(1); // "00X..." → "0X..."
  }

  // 81（国際番号）→ 0 + 残り
  if (digits.startsWith("81") && digits.length >= 11) {
    digits = "0" + digits.slice(2);
  }

  // 先頭0なし & 7/8/9始まり → 0追加
  if (!digits.startsWith("0") && /^[789]/.test(digits)) {
    digits = "0" + digits;
  }

  return digits;
}

// --------------------------------------------------------
// 1. orders.phone を修正
// --------------------------------------------------------
console.log("\n--- orders.phone ---");
const { data: ordersWithBadPhone, error: oErr } = await supabase
  .from("orders")
  .select("id, phone, patient_id")
  .like("phone", "00%")
  .limit(100000);

if (oErr) {
  console.error("orders取得エラー:", oErr.message);
  process.exit(1);
}

console.log(`00プレフィックス付き: ${ordersWithBadPhone.length}件`);

let ordersFixed = 0;
let ordersSkipped = 0;
for (const row of ordersWithBadPhone) {
  const before = row.phone;
  const after = normalizeJPPhone(before);

  if (before === after) {
    ordersSkipped++;
    continue;
  }

  // 安全チェック: 修正後が0始まりであること
  if (!after.startsWith("0")) {
    console.warn(`  ⚠ スキップ (0始まりにならない): ${before} → ${after} [order=${row.id}]`);
    ordersSkipped++;
    continue;
  }

  if (ordersFixed < 10) {
    console.log(`  ${before} → ${after}  [patient=${row.patient_id}]`);
  }

  if (!dryRun) {
    const { error } = await supabase
      .from("orders")
      .update({ phone: after })
      .eq("id", row.id);
    if (error) {
      console.error(`  ✗ order ${row.id}: ${error.message}`);
    }
  }
  ordersFixed++;
}

if (ordersFixed > 10) console.log(`  ... 他 ${ordersFixed - 10}件`);
console.log(`orders修正: ${ordersFixed}件, スキップ: ${ordersSkipped}件`);

// --------------------------------------------------------
// 2. answerers.tel を修正
// --------------------------------------------------------
console.log("\n--- answerers.tel ---");
const { data: answerersBadTel, error: aErr } = await supabase
  .from("answerers")
  .select("id, tel, name")
  .like("tel", "00%")
  .limit(100000);

if (aErr) {
  console.error("answerers取得エラー:", aErr.message);
} else {
  console.log(`00プレフィックス付き: ${answerersBadTel.length}件`);

  let ansFixed = 0;
  let ansSkipped = 0;
  for (const row of answerersBadTel) {
    const before = row.tel;
    const after = normalizeJPPhone(before);

    if (before === after) {
      ansSkipped++;
      continue;
    }

    if (!after.startsWith("0")) {
      console.warn(`  ⚠ スキップ (0始まりにならない): ${before} → ${after} [answerer=${row.id}]`);
      ansSkipped++;
      continue;
    }

    if (ansFixed < 10) {
      console.log(`  ${before} → ${after}  [name=${row.name}]`);
    }

    if (!dryRun) {
      const { error } = await supabase
        .from("answerers")
        .update({ tel: after })
        .eq("id", row.id);
      if (error) {
        console.error(`  ✗ answerer ${row.id}: ${error.message}`);
      }
    }
    ansFixed++;
  }

  if (ansFixed > 10) console.log(`  ... 他 ${ansFixed - 10}件`);
  console.log(`answerers修正: ${ansFixed}件, スキップ: ${ansSkipped}件`);
}

console.log(dryRun ? "\n✅ ドライラン完了。--exec で本番実行してください" : "\n✅ 修正完了");
