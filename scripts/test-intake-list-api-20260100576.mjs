// scripts/test-intake-list-api-20260100576.mjs
// /api/intake/list APIで20260100576が取得できるか確認

import { readFileSync } from "fs";
import { resolve } from "path";

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

const patientId = "20260100576";
const targetDate = "2026-01-30";

async function testApi() {
  console.log("=== /api/intake/list APIテスト ===\n");

  // カルテページのデフォルト範囲をシミュレート（当日-2日～+5日）
  const now = new Date("2026-01-30");  // 1/30を基準にテスト
  const fromDate = new Date(now);
  fromDate.setDate(now.getDate() - 2);
  const toDate = new Date(now);
  toDate.setDate(now.getDate() + 5);

  const fromIso = fromDate.toISOString().slice(0, 10);
  const toIso = toDate.toISOString().slice(0, 10);

  console.log(`1. デフォルト範囲で取得: ${fromIso} 〜 ${toIso}\n`);

  // Supabaseを使用するかチェック
  const useSupabase = envVars.NEXT_PUBLIC_SUPABASE_URL && envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  console.log(`データソース: ${useSupabase ? "Supabase" : "GAS"}\n`);

  // Supabase経由でテスト
  if (useSupabase) {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    let query = supabase
      .from("intake")
      .select("*")
      .order("created_at", { ascending: false });

    // 日付フィルタ
    query = query
      .gte("reserved_date", fromIso)
      .lte("reserved_date", toIso)
      .not("reserved_date", "is", null);

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabaseクエリエラー:", error);
      return;
    }

    console.log(`✅ 取得成功: ${data.length} 件\n`);

    // patient 20260100576 を検索
    const target = data.find(r => String(r.patient_id).trim() === patientId);

    console.log(`【patient_id: ${patientId} の検索結果】`);
    if (target) {
      console.log("  ✅ 見つかりました");
      console.log(`  patient_id: ${target.patient_id}`);
      console.log(`  patient_name: ${target.patient_name}`);
      console.log(`  reserve_id: ${target.reserve_id}`);
      console.log(`  reserved_date: ${target.reserved_date}`);
      console.log(`  reserved_time: ${target.reserved_time}`);
      console.log(`  status: ${target.status || "空欄"}`);
    } else {
      console.log("  ❌ 見つかりません");
      console.log("\n【原因を調査】");

      // reserved_dateで絞り込む前のデータを取得
      const { data: allData } = await supabase
        .from("intake")
        .select("patient_id, patient_name, reserved_date, reserve_id")
        .eq("patient_id", patientId)
        .maybeSingle();

      if (allData) {
        console.log("  Supabase intakeテーブルには存在します:");
        console.log(`    patient_id: ${allData.patient_id}`);
        console.log(`    patient_name: ${allData.patient_name}`);
        console.log(`    reserved_date: ${allData.reserved_date || "NULL ← これが原因！"}`);
        console.log(`    reserve_id: ${allData.reserve_id}`);

        if (!allData.reserved_date) {
          console.log("\n  ❌ reserved_date が NULL なので除外されています");
        } else if (allData.reserved_date < fromIso || allData.reserved_date > toIso) {
          console.log(`\n  ❌ reserved_date (${allData.reserved_date}) が範囲外です`);
          console.log(`     範囲: ${fromIso} 〜 ${toIso}`);
        }
      } else {
        console.log("  ❌ Supabase intakeテーブルにも存在しません");
      }
    }
  }

  // フロントエンドのフィルタリングをシミュレート
  console.log("\n\n=== フロントエンドのフィルタリング ===\n");
  console.log(`選択日付: ${targetDate}`);
  console.log("カルテページは取得したデータから reserved_date === selectedDate のみ表示");
  console.log("（app/doctor/page.tsx 499-504行目）");
}

testApi();
