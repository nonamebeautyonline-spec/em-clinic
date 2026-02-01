// scripts/check-gas-intake-total.mjs
// GASの問診シートとAPIで取得できるデータ件数を確認

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const gasIntakeListUrl = envVars.GAS_INTAKE_LIST_URL;

console.log("=== GAS問診データとSupabaseの件数比較 ===\n");

async function checkTotal() {
  // 1. GAS APIから日付フィルタなしで全件取得を試行
  console.log("【1】GAS_INTAKE_LIST_URL（フィルタなし）で全件取得...");

  try {
    const response1 = await fetch(gasIntakeListUrl, { method: "GET" });
    const data1 = await response1.json();

    if (Array.isArray(data1)) {
      console.log(`✅ 取得件数: ${data1.length}件`);

      // patient_idがあるレコードのみカウント
      const withPatientId = data1.filter(row => {
        const pid = String(row.patient_id || "").trim();
        return pid && pid !== "";
      });

      console.log(`  うちpatient_idあり: ${withPatientId.length}件\n`);
    } else {
      console.log("❌ 配列ではないデータが返されました");
      console.log(data1);
    }
  } catch (err) {
    console.log("❌ エラー:", err.message);
  }

  // 2. 過去1年分で試行
  console.log("【2】GAS_INTAKE_LIST_URL（過去365日分）で取得...");

  try {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 365);
    const fromDate = from.toISOString().split("T")[0];
    const toDate = today.toISOString().split("T")[0];

    const url = `${gasIntakeListUrl}?from=${fromDate}&to=${toDate}`;
    const response2 = await fetch(url, { method: "GET" });
    const data2 = await response2.json();

    if (Array.isArray(data2)) {
      console.log(`✅ 取得件数: ${data2.length}件`);

      const withPatientId = data2.filter(row => {
        const pid = String(row.patient_id || "").trim();
        return pid && pid !== "";
      });

      console.log(`  うちpatient_idあり: ${withPatientId.length}件\n`);
    } else {
      console.log("❌ 配列ではないデータが返されました");
    }
  } catch (err) {
    console.log("❌ エラー:", err.message);
  }

  // 3. Supabase intakeテーブルの件数
  console.log("【3】Supabase intakeテーブル件数確認...");

  const { count: supabaseCount } = await supabase
    .from("intake")
    .select("patient_id", { count: "exact", head: true });

  console.log(`✅ Supabase: ${supabaseCount}件\n`);

  // 4. 差分計算
  console.log("【4】GASシート情報:");
  console.log("  ユーザー報告: 2652行（ヘッダー抜き2651人分）");
  console.log(`  GAS API取得: 上記参照`);
  console.log(`  Supabase: ${supabaseCount}件`);
  console.log(`\n  ⚠️ GAS APIで全件取得できていない可能性があります`);
  console.log(`  ⚠️ 1000件API制限、または日付フィルタの影響を確認してください`);
}

checkTotal().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
