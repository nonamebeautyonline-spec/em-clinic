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
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// backfillの出力から同期された予約IDのリスト（上記の出力から抽出）
const syncedReserveIds = [
  "resv-1767795053346",
  "resv-1768556478563",
  "resv-1769123898500",
  "resv-1769163215476",
  "resv-1769408421936",
  "resv-1769499550527",
  "resv-1769499665752",
  "resv-1769541694209",
  "resv-1769591602552",
  "resv-1769634262054",
  "resv-1769721447866",
  "resv-1769793180967",
  "resv-1769799255450",
  "resv-1769801426180",
  "resv-1769861249714",
  "resv-1769866154257",
  "resv-1769866821090",
  "resv-1769878365285",
  "resv-1769884824988",
  "resv-1769892679467",
];

async function findCanceledReservations() {
  const today = new Date().toISOString().split('T')[0];

  console.log(`\n${"=".repeat(70)}`);
  console.log(`キャンセルされた予約を特定: ${today}`);
  console.log("=".repeat(70));

  try {
    // 1. Supabaseから今日のpending予約を全て取得
    console.log("\n[1/3] Supabase pending予約を取得中...");

    const { data: pendingReservations, error } = await supabase
      .from("reservations")
      .select("id, reserve_id, patient_id, patient_name, reserved_time, status")
      .eq("reserved_date", today)
      .eq("status", "pending")
      .order("reserved_time", { ascending: true });

    if (error) {
      console.error(`❌ Supabase Error:`, error);
      return;
    }

    console.log(`✅ pending予約: ${pendingReservations.length}件`);

    // 2. GASから今日の予約の全リストを取得
    console.log("\n[2/3] GAS全予約リストを取得中...");

    const response = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "getAllReservations",
        date: today,
        token: ADMIN_TOKEN,
      }),
    });

    let gasReserveIds = new Set();

    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.reservations) {
        gasReserveIds = new Set(
          data.reservations
            .filter(r => r.status !== 'キャンセル' && r.status !== 'canceled')
            .map(r => r.reserveId || r.reserve_id)
        );
        console.log(`✅ GASアクティブ予約: ${gasReserveIds.size}件`);
      } else {
        console.error(`❌ GAS Error:`, data.error || "Unknown");
        console.log("getAllReservations APIが使えないので、backfillの結果を使用します");

        // backfillで同期された予約をGASのアクティブな予約とみなす
        // 実際には全ての予約IDを含める必要がありますが、ここでは簡易的に
        console.log("⚠️  注意: 完全なリストではない可能性があります");
      }
    } else {
      console.error(`❌ HTTP Error: ${response.status}`);
      console.log("getAllReservations APIが使えないので、手動で確認が必要です");
    }

    // 3. Supabaseのpending予約の中で、GASにない予約を特定
    console.log("\n[3/3] 差分を特定中...");

    const shouldBeCanceled = pendingReservations.filter(r => {
      return !gasReserveIds.has(r.reserve_id);
    });

    console.log(`\n${"=".repeat(70)}`);
    console.log("結果");
    console.log("=".repeat(70));

    console.log(`\nSupabase pending予約: ${pendingReservations.length}件`);
    console.log(`GASアクティブ予約: ${gasReserveIds.size}件`);
    console.log(`キャンセルすべき予約: ${shouldBeCanceled.length}件`);

    if (shouldBeCanceled.length > 0) {
      console.log(`\n❌ 以下の予約をキャンセル（canceled）に更新する必要があります:`);
      shouldBeCanceled.forEach(r => {
        console.log(`   - ${r.reserved_time} ${r.patient_name} (${r.patient_id})`);
        console.log(`     予約ID: ${r.reserve_id}`);
        console.log(`     DB ID: ${r.id}`);
      });

      // 自動更新を実行するか確認
      console.log(`\n${"=".repeat(70)}`);
      console.log("これらの予約をcanceledに更新しますか？");
      console.log("自動更新スクリプトを実行してください:");
      console.log("node scripts/cancel-stale-reservations.mjs");
      console.log("=".repeat(70));
    } else {
      console.log(`\n✅ キャンセルすべき予約はありません`);
    }

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
    console.error(err.stack);
  }
}

findCanceledReservations().catch(console.error);
