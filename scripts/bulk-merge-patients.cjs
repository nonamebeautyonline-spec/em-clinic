/**
 * 重複患者の一括統合スクリプト
 * 旧PID（LINE UID null）のデータを新PID（LINE有）に移行し、旧患者レコードを削除
 *
 * 使い方:
 *   node scripts/bulk-merge-patients.cjs          # ドライラン（変更なし）
 *   node scripts/bulk-merge-patients.cjs --exec   # 本番実行
 */
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = !process.argv.includes("--exec");

// 統合対象テーブル（patient_idカラムを持つ全テーブル）
const MERGE_TABLES = [
  "intake",
  "orders",
  "reservations",
  "reorders",
  "message_log",
  "patient_tags",
  "patient_marks",
  "friend_field_values",
  "coupon_issues",
  "nps_responses",
  "form_responses",
  "step_enrollments",
  "bank_transfer_orders",
  "chat_reads",
];

// 統合ペア [旧PID(LINE null), 新PID(LINE有), 氏名]
const MERGE_PAIRS = [
  ["20251200223", "20260201075", "黒崎真由美"],
  ["20251200252", "20260200933", "古屋鋪優華"],
  ["20251200332", "20260201137", "目代遥"],
  ["20251200388", "20260201046", "木藤真理"],
  ["20251200465", "20260200784", "松岡はづき"],
  ["20251200254", "20260200593", "牧野七海"],
  ["20251200019", "20260200975", "内山春花"],
  ["20251200242", "LINE_d48f3e5b", "菅原美里"],
  ["20260101668", "235778694", "柿崎琉奈"],
  ["20260200463", "LINE_c2d98969", "鈴木結來"],
  ["20251200237", "LINE_38575fcc", "金沢由佳"],
];

// くもひろ: 20260200918 のデータ削除（orders/reorders/reservations/message_log = 0件、intakeのみ）
const KUMO_DELETE_PID = "20260200918";

async function mergePatient(oldPid, newPid, name) {
  console.log(`\n=== ${name}: ${oldPid} → ${newPid} ===`);

  // 旧患者情報取得
  const { data: oldPatient } = await supabase
    .from("patients")
    .select("patient_id, name, name_kana, tel, sex, birthday, line_id")
    .eq("patient_id", oldPid)
    .maybeSingle();

  if (!oldPatient) {
    console.log(`  ⚠ 旧患者 ${oldPid} が見つかりません。スキップ`);
    return false;
  }

  // 新患者情報取得
  const { data: newPatient } = await supabase
    .from("patients")
    .select("patient_id, name, name_kana, tel, sex, birthday, line_id")
    .eq("patient_id", newPid)
    .maybeSingle();

  if (!newPatient) {
    console.log(`  ⚠ 新患者 ${newPid} が見つかりません。スキップ`);
    return false;
  }

  // 各テーブルのデータ件数確認 & 移行
  for (const table of MERGE_TABLES) {
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("patient_id", oldPid);

    if (count && count > 0) {
      console.log(`  ${table}: ${count}件を移行`);
      if (!DRY_RUN) {
        const { error } = await supabase
          .from(table)
          .update({ patient_id: newPid })
          .eq("patient_id", oldPid);
        if (error) {
          console.error(`    ✗ ${table} 更新エラー: ${error.message}`);
        } else {
          console.log(`    ✓ 完了`);
        }
      }
    }
  }

  // 患者情報の統合（新側の空フィールドを旧側で補完）
  const merged = {
    line_id: newPatient.line_id || oldPatient.line_id || null,
    name: newPatient.name || oldPatient.name || null,
    name_kana: newPatient.name_kana || oldPatient.name_kana || null,
    tel: newPatient.tel || oldPatient.tel || null,
    sex: newPatient.sex || oldPatient.sex || null,
    birthday: newPatient.birthday || oldPatient.birthday || null,
  };

  console.log("  patients統合:");
  console.log(`    name: ${newPatient.name || "(なし)"} ← ${oldPatient.name || "(なし)"} → ${merged.name}`);
  console.log(`    tel: ${newPatient.tel || "(なし)"} ← ${oldPatient.tel || "(なし)"} → ${merged.tel}`);
  console.log(`    line_id: ${newPatient.line_id || "null"} (維持)`);

  if (!DRY_RUN) {
    const { error: updateErr } = await supabase
      .from("patients")
      .update(merged)
      .eq("patient_id", newPid);
    if (updateErr) {
      console.error(`    ✗ patients更新エラー: ${updateErr.message}`);
    }

    // 旧患者レコード削除
    const { error: delErr } = await supabase
      .from("patients")
      .delete()
      .eq("patient_id", oldPid);
    if (delErr) {
      console.error(`    ✗ 旧患者削除エラー: ${delErr.message}`);
    } else {
      console.log(`    ✓ 旧患者 ${oldPid} 削除完了`);
    }
  }

  return true;
}

async function deleteKumo() {
  console.log(`\n=== くもひろ: ${KUMO_DELETE_PID} 削除 ===`);

  // データ確認
  for (const table of MERGE_TABLES) {
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("patient_id", KUMO_DELETE_PID);
    if (count && count > 0) {
      console.log(`  ${table}: ${count}件を削除`);
      if (!DRY_RUN) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("patient_id", KUMO_DELETE_PID);
        if (error) {
          console.error(`    ✗ ${table} 削除エラー: ${error.message}`);
        } else {
          console.log(`    ✓ 完了`);
        }
      }
    }
  }

  // 患者レコード削除
  console.log("  patients: 削除");
  if (!DRY_RUN) {
    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("patient_id", KUMO_DELETE_PID);
    if (error) {
      console.error(`    ✗ 患者削除エラー: ${error.message}`);
    } else {
      console.log(`    ✓ 完了`);
    }
  }
}

(async () => {
  console.log(DRY_RUN ? "🔍 ドライラン（変更なし）" : "🚀 本番実行");
  console.log("統合対象: " + MERGE_PAIRS.length + "ペア + くもひろ削除");

  let success = 0;
  let fail = 0;

  for (const [oldPid, newPid, name] of MERGE_PAIRS) {
    const ok = await mergePatient(oldPid, newPid, name);
    if (ok) success++;
    else fail++;
  }

  await deleteKumo();

  console.log("\n=== 完了 ===");
  console.log(`成功: ${success}件 / 失敗: ${fail}件`);
  if (DRY_RUN) {
    console.log("※ ドライランのため実際の変更はありません。本番実行: node scripts/bulk-merge-patients.cjs --exec");
  }
})();
