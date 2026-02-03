import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL;
const RESERVE_SECRET = process.env.RESERVE_SECRET || process.env.KARTE_API_KEY;

async function checkTodayReservationsSync() {
  const today = new Date().toISOString().split('T')[0];

  console.log(`\n${"=".repeat(70)}`);
  console.log(`今日の予約同期状況チェック: ${today}`);
  console.log("=".repeat(70));

  try {
    // 1. GASから今日の予約を取得
    console.log("\n[1/3] GAS予約シートから取得中...");

    const gasResponse = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "list",
        date: today,
        secret: RESERVE_SECRET,
      }),
    });

    if (!gasResponse.ok) {
      console.error(`❌ GAS HTTP Error: ${gasResponse.status}`);
      const text = await gasResponse.text();
      console.error(text);
      return;
    }

    const gasData = await gasResponse.json();

    if (!gasData.ok) {
      console.error(`❌ GAS Error:`, gasData.error);
      return;
    }

    const gasReservations = gasData.reservations || [];
    console.log(`✅ GAS予約取得: ${gasReservations.length}件`);

    // ステータス別にカウント
    const gasByStatus = {
      pending: gasReservations.filter(r => r.status === 'pending').length,
      canceled: gasReservations.filter(r => r.status === 'canceled').length,
      completed: gasReservations.filter(r => r.status === 'completed').length,
    };

    console.log(`   - pending: ${gasByStatus.pending}件`);
    console.log(`   - canceled: ${gasByStatus.canceled}件`);
    console.log(`   - completed: ${gasByStatus.completed}件`);

    // 2. Supabaseから今日の予約を取得
    console.log("\n[2/3] Supabase reservationsテーブルから取得中...");

    const { data: dbReservations, error: dbError } = await supabase
      .from("reservations")
      .select("id, patient_id, reserved_date, reserved_time, status, reserve_id")
      .eq("reserved_date", today)
      .order("reserved_time", { ascending: true });

    if (dbError) {
      console.error(`❌ Supabase Error:`, dbError);
      return;
    }

    console.log(`✅ Supabase予約取得: ${dbReservations.length}件`);

    // ステータス別にカウント
    const dbByStatus = {
      pending: dbReservations.filter(r => r.status === 'pending').length,
      canceled: dbReservations.filter(r => r.status === 'canceled').length,
      completed: dbReservations.filter(r => r.status === 'completed').length,
    };

    console.log(`   - pending: ${dbByStatus.pending}件`);
    console.log(`   - canceled: ${dbByStatus.canceled}件`);
    console.log(`   - completed: ${dbByStatus.completed}件`);

    // 3. 差分を確認
    console.log("\n[3/3] 差分チェック中...");

    // reserve_idでマッピング
    const gasMap = new Map();
    gasReservations.forEach(r => {
      gasMap.set(r.reserveId || r.reserve_id, r);
    });

    const dbMap = new Map();
    dbReservations.forEach(r => {
      dbMap.set(r.reserve_id, r);
    });

    // GASにあってDBにない予約
    const missingInDb = [];
    gasReservations.forEach(gr => {
      const rid = gr.reserveId || gr.reserve_id;
      if (!dbMap.has(rid)) {
        missingInDb.push(gr);
      }
    });

    // ステータスが一致しない予約
    const statusMismatch = [];
    dbReservations.forEach(dr => {
      const gasReservation = gasMap.get(dr.reserve_id);
      if (gasReservation) {
        if (gasReservation.status !== dr.status) {
          statusMismatch.push({
            reserve_id: dr.reserve_id,
            patient_id: dr.patient_id,
            gas_status: gasReservation.status,
            db_status: dr.status,
            reserved_time: dr.reserved_time,
          });
        }
      }
    });

    // 結果表示
    console.log(`\n${"=".repeat(70)}`);
    console.log("差分サマリー");
    console.log("=".repeat(70));

    console.log(`\n【GAS】 合計: ${gasReservations.length}件`);
    console.log(`  - pending: ${gasByStatus.pending}件`);
    console.log(`  - canceled: ${gasByStatus.canceled}件`);
    console.log(`  - completed: ${gasByStatus.completed}件`);

    console.log(`\n【Supabase】 合計: ${dbReservations.length}件`);
    console.log(`  - pending: ${dbByStatus.pending}件`);
    console.log(`  - canceled: ${dbByStatus.canceled}件`);
    console.log(`  - completed: ${dbByStatus.completed}件`);

    if (missingInDb.length > 0) {
      console.log(`\n⚠️  GASにあってSupabaseにない予約: ${missingInDb.length}件`);
      missingInDb.forEach(r => {
        console.log(`   - ${r.reserveId || r.reserve_id}: ${r.patientName || r.patient_name} (${r.status})`);
      });
    }

    if (statusMismatch.length > 0) {
      console.log(`\n❌ ステータス不一致: ${statusMismatch.length}件`);
      statusMismatch.forEach(m => {
        console.log(`   - ${m.reserve_id} (${m.reserved_time})`);
        console.log(`     患者ID: ${m.patient_id}`);
        console.log(`     GAS: ${m.gas_status} → Supabase: ${m.db_status}`);
      });

      // キャンセルされているのにDBがpendingのものを特定
      const needsCancelSync = statusMismatch.filter(
        m => m.gas_status === 'canceled' && m.db_status === 'pending'
      );

      if (needsCancelSync.length > 0) {
        console.log(`\n🔧 修正が必要（GASでキャンセル済みだがSupabaseがpending）: ${needsCancelSync.length}件`);
        needsCancelSync.forEach(m => {
          console.log(`   - ${m.reserve_id}: 患者ID ${m.patient_id}`);
        });
      }
    } else {
      console.log(`\n✅ ステータス不一致なし`);
    }

    console.log(`\n${"=".repeat(70)}`);

    // 修正が必要な場合はreserve_idリストを出力
    if (statusMismatch.length > 0) {
      const canceledInGas = statusMismatch.filter(m => m.gas_status === 'canceled' && m.db_status !== 'canceled');
      if (canceledInGas.length > 0) {
        console.log("\n修正SQLクエリ:");
        console.log("```sql");
        console.log("UPDATE reservations");
        console.log("SET status = 'canceled', updated_at = NOW()");
        console.log("WHERE reserve_id IN (");
        canceledInGas.forEach((m, i) => {
          console.log(`  '${m.reserve_id}'${i < canceledInGas.length - 1 ? ',' : ''}`);
        });
        console.log(");");
        console.log("```");
      }
    }

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
    console.error(err.stack);
  }
}

checkTodayReservationsSync().catch(console.error);
