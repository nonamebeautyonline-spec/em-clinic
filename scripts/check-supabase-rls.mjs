// scripts/check-supabase-rls.mjs
// SupabaseのRLSポリシーを確認し、実際に書き込みテストを行う

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

console.log("=== Supabase RLS & 書き込みテスト ===\n");

async function testRLS() {
  const testPid = "TEST_RLS_" + Date.now();

  console.log("【テスト1】新規レコードをupsert（/api/intakeと同じ形式）");
  console.log(`  test patient_id: ${testPid}\n`);

  const fullAnswers = {
    氏名: "テスト患者",
    name: "テスト患者",
    性別: "女性",
    sex: "女性",
    生年月日: "1990-01-01",
    birth: "1990-01-01",
    カナ: "テストカンジャ",
    name_kana: "テストカンジャ",
    電話番号: "09012345678",
    tel: "09012345678",
  };

  // /api/intake と全く同じupsert
  const { data, error, status, statusText } = await supabase
    .from("intake")
    .upsert({
      patient_id: testPid,
      patient_name: "テスト患者",
      answerer_id: null,
      line_id: null,
      reserve_id: null,
      reserved_date: null,
      reserved_time: null,
      status: null,
      note: null,
      prescription_menu: null,
      answers: fullAnswers,
    }, {
      onConflict: "patient_id",
    });

  console.log("結果:");
  console.log(`  status: ${status}`);
  console.log(`  statusText: ${statusText}`);
  console.log(`  error: ${error ? JSON.stringify(error) : "null"}`);
  console.log(`  data: ${data ? JSON.stringify(data) : "null"}`);

  if (error) {
    console.log("\n❌ upsert失敗");
    console.log("  エラーコード:", error.code);
    console.log("  エラーメッセージ:", error.message);
    console.log("  詳細:", error.details);
    console.log("  ヒント:", error.hint);

    if (error.code === "42501") {
      console.log("\n  → RLS (Row Level Security) ポリシーで書き込みがブロックされています！");
      console.log("  → Supabase Dashboard → Authentication → Policies で intake テーブルのポリシーを確認してください");
    }
  } else {
    console.log("\n✅ upsert成功");

    // 確認
    const { data: checkData } = await supabase
      .from("intake")
      .select("*")
      .eq("patient_id", testPid)
      .maybeSingle();

    if (checkData) {
      console.log("✅ データ確認成功: レコードが存在します");
      console.log(`  patient_name: ${checkData.patient_name}`);
    } else {
      console.log("❌ データ確認失敗: レコードが存在しません");
      console.log("  → upsertは成功したが、RLSポリシーでSELECTがブロックされている可能性");
    }

    // クリーンアップ
    await supabase.from("intake").delete().eq("patient_id", testPid);
    console.log("✅ テストレコード削除完了");
  }

  console.log("\n【テスト2】answerers テーブルも同様にテスト");

  const { data: ansData, error: ansError, status: ansStatus } = await supabase
    .from("answerers")
    .upsert({
      patient_id: testPid,
      answerer_id: null,
      line_id: null,
      name: "テスト患者",
      name_kana: "テストカンジャ",
      sex: "女性",
      birthday: "1990-01-01",
      tel: "09012345678",
    }, {
      onConflict: "patient_id",
    });

  console.log(`  status: ${ansStatus}`);
  console.log(`  error: ${ansError ? JSON.stringify(ansError) : "null"}`);

  if (ansError) {
    console.log("❌ answerers upsert失敗");
    if (ansError.code === "42501") {
      console.log("  → RLSポリシーでブロックされています");
    }
  } else {
    console.log("✅ answerers upsert成功");
    await supabase.from("answerers").delete().eq("patient_id", testPid);
    console.log("✅ テストレコード削除完了");
  }

  console.log("\n【結論】");
  if (error || ansError) {
    console.log("❌ Supabase書き込みに問題があります");
    console.log("次のステップ:");
    console.log("1. Supabase Dashboard → Database → Tables → intake → RLS を確認");
    console.log("2. ANON_KEY での INSERT ポリシーが有効か確認");
    console.log("3. もしくは、RLS を一時的に無効化してテスト");
  } else {
    console.log("✅ Supabase書き込みは正常に動作しています");
    console.log("→ 本番環境で問題が発生している場合、以下を確認:");
    console.log("  1. Vercel環境変数が正しいSupabase URLとKEYを指しているか");
    console.log("  2. Vercel Functionのタイムアウト設定");
    console.log("  3. 本番環境のログで実際のエラーメッセージを確認");
  }
}

testRLS();
