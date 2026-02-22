// scripts/repair-missing-patients.mjs
// Phase 2-1: intakeにあるがpatientsにないpatient_idを修復
// intakeのpatient_name, line_idをpatientsテーブルにINSERT
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("=== Phase 2-1: patientsテーブルへの欠損レコード追加 ===\n");

  // intakeの全patient_id取得
  const { data: allIntake, error: e1 } = await sb
    .from("intake")
    .select("patient_id, patient_name, line_id, created_at")
    .not("patient_id", "is", null)
    .order("created_at", { ascending: false });

  if (e1) {
    console.error("intakeクエリエラー:", e1.message);
    return;
  }

  // patientsの全patient_id取得
  const { data: allPatients, error: e2 } = await sb
    .from("patients")
    .select("patient_id");

  if (e2) {
    console.error("patientsクエリエラー:", e2.message);
    return;
  }

  const existingPids = new Set((allPatients || []).map((p) => p.patient_id));

  // intakeにしかないpatient_idを収集（最新レコードからデータを取得）
  const missingMap = new Map(); // patient_id -> { name, line_id }
  for (const i of allIntake) {
    if (existingPids.has(i.patient_id)) continue;
    if (missingMap.has(i.patient_id)) continue; // 最新のものを優先（created_at DESC）

    missingMap.set(i.patient_id, {
      patient_id: i.patient_id,
      name: i.patient_name || null,
      line_id: i.line_id || null,
    });
  }

  console.log(`patientsに存在しないpatient_id: ${missingMap.size}件`);

  if (missingMap.size === 0) {
    console.log("修復不要です。");
    return;
  }

  // サンプル表示
  const samples = [...missingMap.values()].slice(0, 10);
  console.log("\nサンプル（先頭10件）:");
  samples.forEach((s) =>
    console.log(`  pid=${s.patient_id} name=${s.name} line_id=${s.line_id?.substring(0, 10)}...`)
  );

  // バッチINSERT（50件ずつ）
  const records = [...missingMap.values()];
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { error } = await sb.from("patients").insert(batch);
    if (error) {
      console.error(`バッチ ${i}-${i + batch.length} エラー:`, error.message);
      // 個別INSERTにフォールバック
      for (const r of batch) {
        const { error: singleErr } = await sb.from("patients").insert(r);
        if (singleErr) {
          console.error(`  個別エラー pid=${r.patient_id}:`, singleErr.message);
          errors++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\n結果: ${inserted}件INSERT / ${errors}件エラー`);

  // 再検証
  const { data: recheck } = await sb.from("patients").select("patient_id");
  const recheckSet = new Set((recheck || []).map((p) => p.patient_id));
  const stillMissing = records.filter((r) => !recheckSet.has(r.patient_id));
  console.log(`再検証: まだ不足=${stillMissing.length}件`);
}

main().catch(console.error);
