// scripts/check-intake-total-count.mjs
// intakeテーブルの総件数を正確に確認

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

async function check() {
  console.log("=== intakeテーブルの総件数を確認 ===\n");

  // 1. 総件数をcount取得
  const { count: totalCount, error: countError } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("❌ カウント取得エラー:", countError);
    return;
  }

  console.log(`総レコード数: ${totalCount} 件\n`);

  // 2. status別の件数を集計（全件取得）
  console.log("【status別の件数（全件）】\n");

  // status が NULL の件数
  const { count: nullCount } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true })
    .is("status", null);

  // status = "OK" の件数
  const { count: okCount } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true })
    .eq("status", "OK");

  // status = "NG" の件数
  const { count: ngCount } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true })
    .eq("status", "NG");

  // status = "pending" の件数
  const { count: pendingCount } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // 空文字列の件数
  const { count: emptyCount } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true })
    .eq("status", "");

  console.log(`  NULL: ${nullCount} 件`);
  console.log(`  OK: ${okCount} 件`);
  console.log(`  NG: ${ngCount} 件`);
  console.log(`  pending: ${pendingCount} 件`);
  console.log(`  空文字列: ${emptyCount} 件`);

  const sum = (nullCount || 0) + (okCount || 0) + (ngCount || 0) + (pendingCount || 0) + (emptyCount || 0);
  console.log(`  合計: ${sum} 件`);

  if (sum !== totalCount) {
    console.log(`\n  ⚠️ 合計が総数と一致しません（差分: ${totalCount - sum} 件）`);
    console.log(`  → 他のstatus値が存在する可能性があります`);

    // 他のstatus値を確認
    console.log("\n【他のstatus値を調査】");
    const { data: otherStatuses } = await supabase
      .from("intake")
      .select("status")
      .not("status", "in", '("OK","NG","pending","")');

    if (otherStatuses && otherStatuses.length > 0) {
      const statusCounts = {};
      otherStatuses.forEach(r => {
        const s = r.status === null ? "NULL" : r.status;
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });

      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} 件`);
      });
    }
  }

  console.log("\n【GAS問診シートとの比較】");
  console.log("GAS問診APIの総件数: 2043 件（先ほどの調査結果）");
  console.log(`Supabase intakeテーブル: ${totalCount} 件`);

  if (totalCount < 2043) {
    console.log(`\n⚠️ GASより ${2043 - totalCount} 件少ないです`);
    console.log("→ データ移行が完了していない可能性があります");
  } else if (totalCount > 2043) {
    console.log(`\n✅ Supabaseの方が ${totalCount - 2043} 件多いです`);
    console.log("→ 削除された問診がGASに残っている可能性があります");
  } else {
    console.log("\n✅ 件数が一致しています");
  }

  // status = "pending" の患者を表示
  if (pendingCount && pendingCount > 0) {
    console.log("\n\n【status = 'pending' の患者】\n");
    const { data: pendingPatients } = await supabase
      .from("intake")
      .select("patient_id, patient_name, reserved_date")
      .eq("status", "pending");

    if (pendingPatients) {
      pendingPatients.forEach(p => {
        console.log(`  ${p.patient_id} (${p.patient_name}) - ${p.reserved_date}`);
      });
    }
  }
}

check();
