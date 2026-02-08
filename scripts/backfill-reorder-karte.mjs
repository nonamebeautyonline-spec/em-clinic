// scripts/backfill-reorder-karte.mjs
// 過去の決済済み再処方に対してカルテ（intakeレコード）を一括作成するスクリプト
//
// 使い方:
//   node scripts/backfill-reorder-karte.mjs          # ドライラン（実行しない）
//   node scripts/backfill-reorder-karte.mjs --exec   # 実際に実行
//
// ロジック:
//   - reordersテーブルから status="paid" のレコードを取得
//   - 各reorderについて、paid_at - 15分のタイムスタンプでカルテを作成
//   - 用量比較:
//     - 前回より増量: "副作用がなく、効果を感じづらくなり増量処方"
//     - 同量: "副作用がなく、継続使用のため処方"
//     - 減量: "副作用がなく、効果も十分にあったため減量処方"

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// ── .env.local パース ──
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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env.local にありません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const dryRun = !process.argv.includes("--exec");

// ── ヘルパー関数 ──

function extractDose(productCode) {
  const m = (productCode || "").match(/(\d+\.?\d*)mg/);
  return m ? parseFloat(m[1]) : null;
}

function formatProductCode(code) {
  if (!code) return "-";
  return code
    .replace("MJL_", "マンジャロ ")
    .replace("_", " ")
    .replace("1m", "1ヶ月")
    .replace("2m", "2ヶ月")
    .replace("3m", "3ヶ月");
}

function buildKarteNote(productCode, prevDose, currentDose) {
  const productName = formatProductCode(productCode);
  let reason;

  if (prevDose == null || currentDose == null) {
    reason = "副作用がなく、継続使用のため処方";
  } else if (currentDose > prevDose) {
    reason = "副作用がなく、効果を感じづらくなり増量処方";
  } else if (currentDose < prevDose) {
    reason = "副作用がなく、効果も十分にあったため減量処方";
  } else {
    reason = "副作用がなく、継続使用のため処方";
  }

  return `再処方決済\n商品: ${productName}\n${reason}`;
}

// ── メイン処理 ──

async function main() {
  console.log(`\n=== 再処方決済カルテ backfill ===`);
  console.log(`モード: ${dryRun ? "ドライラン（--exec で実行）" : "★ 実行モード"}\n`);

  // 1. 決済済みreorderを全件取得（created_at昇順）
  //    paid_at がnullのレコードも多い（Supabase記録前にGAS側で決済済み）ので
  //    paid_at ?? created_at をフォールバックとして使う
  const { data: paidReorders, error: fetchErr } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, product_code, paid_at, created_at")
    .eq("status", "paid")
    .not("patient_id", "is", null)
    .not("product_code", "is", null)
    .order("created_at", { ascending: true });

  if (fetchErr) {
    console.error("reorders取得エラー:", fetchErr);
    process.exit(1);
  }

  console.log(`決済済みreorder: ${paidReorders.length}件\n`);

  if (paidReorders.length === 0) {
    console.log("対象なし。終了します。");
    return;
  }

  // 2. 患者名マップ取得
  const patientIds = [...new Set(paidReorders.map(r => r.patient_id))];
  const nameMap = new Map();

  // 100件ずつ取得
  for (let i = 0; i < patientIds.length; i += 100) {
    const batch = patientIds.slice(i, i + 100);
    const { data: answerers } = await supabase
      .from("answerers")
      .select("patient_id, name")
      .in("patient_id", batch);
    for (const a of answerers || []) {
      nameMap.set(a.patient_id, a.name || "");
    }
  }

  // 3. 患者ごとにreorderをグループ化（paid_at昇順なので前回を追跡可能）
  const byPatient = new Map();
  for (const r of paidReorders) {
    if (!byPatient.has(r.patient_id)) byPatient.set(r.patient_id, []);
    byPatient.get(r.patient_id).push(r);
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const [patientId, reorders] of byPatient) {
    let prevDose = null;

    for (const reorder of reorders) {
      const currentDose = extractDose(reorder.product_code);
      // paid_at がなければ created_at をフォールバック
      const baseTime = reorder.paid_at || reorder.created_at;
      const paidAt = new Date(baseTime);
      const karteTime = new Date(paidAt.getTime() - 15 * 60 * 1000); // -15分
      const productName = formatProductCode(reorder.product_code);

      // 重複チェック: ±30分以内に同じ商品の決済カルテがあるか
      const checkFrom = new Date(karteTime.getTime() - 30 * 60 * 1000).toISOString();
      const checkTo = new Date(karteTime.getTime() + 30 * 60 * 1000).toISOString();

      const { data: existing } = await supabase
        .from("intake")
        .select("id")
        .eq("patient_id", patientId)
        .gte("created_at", checkFrom)
        .lte("created_at", checkTo)
        .ilike("note", `%再処方決済%`)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`  SKIP: patient=${patientId}, product=${reorder.product_code}, paid=${reorder.paid_at} (既存カルテあり)`);
        skipped++;
        prevDose = currentDose;
        continue;
      }

      // カルテ本文生成
      const note = buildKarteNote(reorder.product_code, prevDose, currentDose);
      const patientName = nameMap.get(patientId) || "";

      const doseInfo = prevDose != null && currentDose != null
        ? `${prevDose}mg → ${currentDose}mg`
        : `${currentDose}mg (初回)`;

      if (dryRun) {
        console.log(`  [DRY] patient=${patientId}, product=${reorder.product_code}, dose=${doseInfo}, karteTime=${karteTime.toISOString()}`);
        console.log(`        note: ${note.replace(/\n/g, " | ")}`);
      } else {
        const { error: insertErr } = await supabase.from("intake").insert({
          patient_id: patientId,
          patient_name: patientName,
          note,
          created_at: karteTime.toISOString(),
        });

        if (insertErr) {
          console.error(`  ERROR: patient=${patientId}, product=${reorder.product_code}: ${insertErr.message}`);
          errors++;
        } else {
          console.log(`  OK: patient=${patientId}, product=${reorder.product_code}, dose=${doseInfo}`);
          created++;
        }
      }

      prevDose = currentDose;
    }
  }

  console.log(`\n=== 結果 ===`);
  console.log(`対象: ${paidReorders.length}件`);
  console.log(`作成: ${created}件`);
  console.log(`スキップ: ${skipped}件 (既存カルテあり)`);
  console.log(`エラー: ${errors}件`);
  if (dryRun) {
    console.log(`\n※ ドライランです。実際に作成するには --exec オプションを付けてください。`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
