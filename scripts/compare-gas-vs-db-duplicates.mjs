// scripts/compare-gas-vs-db-duplicates.mjs
// GASの問診シートとSupabaseの重複予約を比較

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
const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;

async function compareGasVsDb() {
  const duplicatePatients = ['20260101381', '20260101529', '20260100132', '20260101409', '20260101586'];

  console.log("=== GAS vs Supabase 予約比較 ===\n");

  // 1. GASから全データ取得
  console.log("1. GASから問診データ取得中...");
  const gasResponse = await fetch(gasIntakeUrl, { method: "GET", redirect: "follow" });

  if (!gasResponse.ok) {
    console.error(`❌ GAS API Error: ${gasResponse.status}`);
    return;
  }

  const gasData = await gasResponse.json();
  let gasRows = gasData.ok && Array.isArray(gasData.rows) ? gasData.rows : gasData;

  console.log(`   GAS総行数: ${gasRows.length}\n`);

  // 2. 各患者について比較
  for (const patientId of duplicatePatients) {
    console.log(`\n========================================`);
    console.log(`patient_id: ${patientId}`);
    console.log(`========================================`);

    // GASから該当患者のデータを検索
    const gasRecords = gasRows.filter(r => {
      const pid = String(r.patient_id || "").trim();
      return pid === patientId;
    });

    console.log(`\n【GAS問診シート】: ${gasRecords.length} 件`);
    if (gasRecords.length > 0) {
      gasRecords.forEach((r, idx) => {
        console.log(`  [${idx + 1}] reserve_id: ${r.reserved || r.reserve_id || r.reserveId || "なし"}`);
        console.log(`      reserved_date: ${r.reserved_date || r.予約日 || "なし"}`);
        console.log(`      name: ${r.name || "なし"}`);
        console.log(`      status: ${r.status || "なし"}`);
        console.log(`      submittedAt: ${r.submittedAt || "なし"}`);
      });
    } else {
      console.log(`  ❌ GASにデータなし`);
    }

    // Supabaseから該当患者のreservationsを取得
    const { data: dbReservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    console.log(`\n【Supabase reservations】: ${dbReservations?.length || 0} 件`);
    if (dbReservations && dbReservations.length > 0) {
      dbReservations.forEach((r, idx) => {
        const inGas = gasRecords.some(g =>
          (g.reserved === r.reserve_id) ||
          (g.reserve_id === r.reserve_id) ||
          (g.reserveId === r.reserve_id)
        );
        const label = idx === 0 ? '[最新]' : `  ${idx + 1}  `;
        const gasLabel = inGas ? '✅ GASにあり' : '❌ GASにない';

        console.log(`  ${label} ${r.reserve_id} - ${gasLabel}`);
        console.log(`      date: ${r.reserved_date}, status: ${r.status || 'null'}`);
        console.log(`      created: ${r.created_at}`);
      });
    }

    // GASのreserve_idを抽出
    const gasReserveIds = gasRecords.map(r =>
      r.reserved || r.reserve_id || r.reserveId
    ).filter(Boolean);

    // Supabaseのreserve_idを抽出
    const dbReserveIds = (dbReservations || []).map(r => r.reserve_id);

    // 差分
    const onlyInGas = gasReserveIds.filter(id => !dbReserveIds.includes(id));
    const onlyInDb = dbReserveIds.filter(id => !gasReserveIds.includes(id));

    console.log(`\n【差分】`);
    if (onlyInGas.length > 0) {
      console.log(`  GASのみ: ${onlyInGas.join(", ")}`);
    }
    if (onlyInDb.length > 0) {
      console.log(`  DBのみ: ${onlyInDb.length} 件`);
      onlyInDb.forEach(id => console.log(`    - ${id}`));
    }
    if (onlyInGas.length === 0 && onlyInDb.length === 0) {
      console.log(`  ✅ 完全一致`);
    }

    // 推奨アクション
    if (gasRecords.length === 1 && dbReservations && dbReservations.length > 1) {
      const gasReserveId = gasRecords[0].reserved || gasRecords[0].reserve_id || gasRecords[0].reserveId;
      console.log(`\n【推奨】`);
      console.log(`  GASには1件のみ: ${gasReserveId}`);
      console.log(`  → DBもこれに統一すべき`);

      if (dbReserveIds.includes(gasReserveId)) {
        console.log(`  ✅ GASのreserve_idはDBにあります`);
        console.log(`  → ${gasReserveId} を残して他を削除`);
      } else {
        console.log(`  ⚠️ GASのreserve_idがDBにありません`);
        console.log(`  → 要確認`);
      }
    }
  }

  console.log("\n\n=== 比較完了 ===");
}

compareGasVsDb();
