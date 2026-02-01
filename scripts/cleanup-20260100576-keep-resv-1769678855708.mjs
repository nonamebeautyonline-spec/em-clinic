// scripts/cleanup-20260100576-keep-resv-1769678855708.mjs
// patient_id: 20260100576 の予約をresv-1769678855708のみ残して削除

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

const patientId = "20260100576";
const keepReserveId = "resv-1769678855708";

async function cleanup() {
  console.log(`=== patient_id: ${patientId} の予約整理 ===\n`);
  console.log(`保持する予約: ${keepReserveId}\n`);

  // 1. 現在の予約状況を確認
  const { data: currentReservations } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date, status, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (!currentReservations || currentReservations.length === 0) {
    console.log("❌ 予約が見つかりません");
    return;
  }

  console.log(`現在の予約数: ${currentReservations.length} 件\n`);
  currentReservations.forEach((r, idx) => {
    const label = r.reserve_id === keepReserveId ? '[保持]' : `  ${idx + 1}  `;
    console.log(`${label} ${r.reserve_id} (${r.reserved_date}) status: ${r.status || 'null'}`);
  });

  // 保持する予約が存在するか確認
  const keepExists = currentReservations.some(r => r.reserve_id === keepReserveId);
  if (!keepExists) {
    console.log(`\n❌ エラー: 保持する予約 ${keepReserveId} が見つかりません`);
    return;
  }

  // 削除対象の予約をリストアップ
  const toDelete = currentReservations.filter(r => r.reserve_id !== keepReserveId);

  if (toDelete.length === 0) {
    console.log(`\n✅ 既に${keepReserveId}のみです`);
    return;
  }

  console.log(`\n削除対象: ${toDelete.length} 件`);
  toDelete.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.reserve_id} (${r.reserved_date}) status: ${r.status || 'null'}`);
  });

  // 確認プロンプト
  console.log(`\n⚠️ この操作は取り消せません。続行しますか？`);
  console.log(`実行する場合は、Supabase DashboardのSQL Editorで以下のSQLを実行してください:\n`);

  console.log(`-- patient_id: ${patientId} の重複予約削除`);
  console.log(`-- 保持: ${keepReserveId}\n`);
  console.log(`DELETE FROM reservations`);
  console.log(`WHERE patient_id = '${patientId}'`);
  console.log(`AND reserve_id != '${keepReserveId}';\n`);

  // 保持する予約の情報を取得
  const kept = currentReservations.find(r => r.reserve_id === keepReserveId);

  console.log(`UPDATE intake`);
  console.log(`SET reserve_id = '${keepReserveId}',`);
  console.log(`    reserved_date = '${kept.reserved_date}',`);
  console.log(`    reserved_time = NULL`);
  console.log(`WHERE patient_id = '${patientId}';\n`);

  console.log(`-- 確認クエリ`);
  console.log(`SELECT reserve_id, reserved_date, status`);
  console.log(`FROM reservations`);
  console.log(`WHERE patient_id = '${patientId}';`);
}

cleanup();
