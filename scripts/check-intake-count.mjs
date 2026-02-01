// scripts/check-intake-count.mjs
// Supabase intakeテーブルの全レコード数を確認

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

async function checkIntakeCount() {
  console.log("=== Supabase intakeテーブル レコード数確認 ===\n");

  // 全レコード数を取得（ページネーション対応）
  let totalCount = 0;
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("intake")
      .select("patient_id", { count: "exact" })
      .range(offset, offset + limit - 1);

    if (error) {
      console.log(`❌ エラー: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) break;

    totalCount += data.length;

    if (data.length < limit) break;

    offset += limit;
  }

  console.log(`✅ Supabase intakeテーブル: ${totalCount}件\n`);

  // reserve_id が NULL のレコード数を確認
  const { data: nullReserveIdRecords } = await supabase
    .from("intake")
    .select("patient_id")
    .is("reserve_id", null);

  const nullReserveIdCount = nullReserveIdRecords?.length || 0;

  console.log(`📋 内訳:`);
  console.log(`  reserve_id が NULL（予約未作成）: ${nullReserveIdCount}件`);
  console.log(`  reserve_id がある（予約済み）: ${totalCount - nullReserveIdCount}件`);
}

checkIntakeCount();
