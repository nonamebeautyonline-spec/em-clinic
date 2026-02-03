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

async function checkTodayReservationsStatus() {
  const today = new Date().toISOString().split('T')[0];

  console.log(`\n${"=".repeat(70)}`);
  console.log(`今日の予約ステータス確認: ${today}`);
  console.log("=".repeat(70));

  try {
    // Supabaseから今日の予約を全て取得
    console.log("\n[1/2] Supabase reservationsテーブルから取得中...");

    const { data: reservations, error } = await supabase
      .from("reservations")
      .select(`
        id,
        reserve_id,
        patient_id,
        patient_name,
        reserved_date,
        reserved_time,
        status,
        created_at,
        updated_at
      `)
      .eq("reserved_date", today)
      .order("reserved_time", { ascending: true });

    if (error) {
      console.error(`❌ Supabase Error:`, error);
      return;
    }

    console.log(`✅ 予約取得: ${reservations.length}件`);

    // ステータス別にカウント
    const byStatus = {
      pending: reservations.filter(r => r.status === 'pending'),
      canceled: reservations.filter(r => r.status === 'canceled'),
      completed: reservations.filter(r => r.status === 'completed'),
      other: reservations.filter(r => !['pending', 'canceled', 'completed'].includes(r.status)),
    };

    console.log(`\n【ステータス別】`);
    console.log(`  - pending: ${byStatus.pending.length}件`);
    console.log(`  - canceled: ${byStatus.canceled.length}件`);
    console.log(`  - completed: ${byStatus.completed.length}件`);
    if (byStatus.other.length > 0) {
      console.log(`  - その他: ${byStatus.other.length}件`);
    }

    // 2. intakeテーブルから今日の予約データを確認
    console.log("\n[2/2] Supabase intakeテーブルから今日の予約患者を確認中...");

    const { data: intakes, error: intakeError } = await supabase
      .from("intake")
      .select("patient_id, patient_name, reserve_id, reserved_date, status")
      .eq("reserved_date", today);

    if (intakeError) {
      console.error(`❌ Intake Error:`, intakeError);
    } else {
      console.log(`✅ Intake取得: ${intakes.length}件`);

      // reserve_idでマッピング
      const intakeByReserveId = new Map();
      intakes.forEach(i => {
        if (i.reserve_id) {
          intakeByReserveId.set(i.reserve_id, i);
        }
      });

      // intakeにあってreservationsにない予約
      const missingInReservations = intakes.filter(i => {
        if (!i.reserve_id) return false;
        return !reservations.some(r => r.reserve_id === i.reserve_id);
      });

      if (missingInReservations.length > 0) {
        console.log(`\n⚠️  intakeにあってreservationsテーブルにない予約: ${missingInReservations.length}件`);
        missingInReservations.forEach(i => {
          console.log(`   - ${i.reserve_id}: ${i.patient_name} (${i.patient_id})`);
        });
      }
    }

    // 詳細リスト表示
    console.log(`\n${"=".repeat(70)}`);
    console.log("今日の予約一覧（時間順）");
    console.log("=".repeat(70));

    reservations.forEach(r => {
      const statusEmoji = {
        pending: '⏳',
        canceled: '❌',
        completed: '✅',
      }[r.status] || '❓';

      console.log(`\n${statusEmoji} ${r.reserved_time} - ${r.patient_name || '(名前なし)'}`);
      console.log(`   患者ID: ${r.patient_id}`);
      console.log(`   予約ID: ${r.reserve_id}`);
      console.log(`   Status: ${r.status}`);
      console.log(`   更新日時: ${r.updated_at}`);
    });

    // キャンセルされた予約のみ表示
    if (byStatus.canceled.length > 0) {
      console.log(`\n${"=".repeat(70)}`);
      console.log(`キャンセルされた予約: ${byStatus.canceled.length}件`);
      console.log("=".repeat(70));

      byStatus.canceled.forEach(r => {
        console.log(`\n❌ ${r.reserved_time} - ${r.patient_name || '(名前なし)'}`);
        console.log(`   患者ID: ${r.patient_id}`);
        console.log(`   予約ID: ${r.reserve_id}`);
        console.log(`   更新日時: ${r.updated_at}`);
      });
    }

    // サマリー
    console.log(`\n${"=".repeat(70)}`);
    console.log("サマリー");
    console.log("=".repeat(70));
    console.log(`合計予約数: ${reservations.length}件`);
    console.log(`  - 有効（pending）: ${byStatus.pending.length}件`);
    console.log(`  - キャンセル: ${byStatus.canceled.length}件`);
    console.log(`  - 完了: ${byStatus.completed.length}件`);

    if (byStatus.pending.length === 70 && reservations.length === 73) {
      console.log(`\n✅ 現在の状況と一致: pending 70件、全体 73件（キャンセル3件含む）`);
    } else if (byStatus.pending.length !== 70) {
      console.log(`\n⚠️  pending件数が70件ではありません: ${byStatus.pending.length}件`);
    }

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
    console.error(err.stack);
  }
}

checkTodayReservationsStatus().catch(console.error);
