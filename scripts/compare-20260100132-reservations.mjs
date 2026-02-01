// scripts/compare-20260100132-reservations.mjs
// 20260100132の2つの予約を比較

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

async function compare() {
  console.log("=== 20260100132の予約比較 ===\n");

  const patientId = "20260100132";

  // Supabaseから全予約を取得
  const { data: reservations } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date, reserved_time, status, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  console.log(`総予約数: ${reservations?.length || 0} 件\n`);

  if (reservations && reservations.length > 0) {
    reservations.forEach((r, idx) => {
      const label = idx === 0 ? '[1]' : '[2]';
      console.log(`${label} reserve_id: ${r.reserve_id}`);
      console.log(`    予約日時: ${r.reserved_date} ${r.reserved_time}`);
      console.log(`    status: ${r.status || 'null'}`);
      console.log(`    作成日時: ${r.created_at}`);
      console.log();
    });
  }

  // 2つの予約の時間差を計算
  if (reservations && reservations.length === 2) {
    const time1 = new Date(reservations[0].created_at);
    const time2 = new Date(reservations[1].created_at);
    const diffSeconds = Math.abs(time1 - time2) / 1000;
    const diffMinutes = Math.floor(diffSeconds / 60);

    console.log(`【作成時間の差】`);
    console.log(`  ${diffMinutes}分${Math.floor(diffSeconds % 60)}秒`);
    console.log(`  → 両方とも同じ予約日時（2026-01-30 17:00）`);
    console.log(`  → リトライで2つ作成されたと思われます`);
  }

  // GASではどちらが使われているか
  console.log(`\n【GAS問診シート】`);
  console.log(`  使用中: resv-1769673522720（古い方）`);
  console.log(`\n【推奨】`);
  console.log(`  resv-1769673647692（新しい方）を削除`);
  console.log(`  resv-1769673522720（古い方）を保持 ← GASと一致`);
}

compare();
