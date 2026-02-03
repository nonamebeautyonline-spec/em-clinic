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

async function checkPatient() {
  const patientId = "20260200126";

  console.log(`\n${"=".repeat(70)}`);
  console.log(`患者ID: ${patientId}`);
  console.log("=".repeat(70));

  try {
    // 1. intakeテーブルから患者情報を取得
    const { data: intake, error: intakeError } = await supabase
      .from("intake")
      .select("*")
      .eq("patient_id", patientId)
      .single();

    if (intakeError) {
      if (intakeError.code === "PGRST116") {
        console.log(`\n❌ 患者が見つかりません（intakeテーブル）`);
      } else {
        console.error(`❌ Intake Error:`, intakeError);
      }
    } else {
      console.log(`\n--- 患者情報 (intake) ---`);
      console.log(`患者名: ${intake.patient_name || "(なし)"}`);
      console.log(`LステップID: ${intake.answerer_id || "(なし)"}`);
      console.log(`LINE User ID: ${intake.line_user_id || "(なし)"}`);
      console.log(`Status: ${intake.status || "(なし)"}`);
      console.log(`作成日時: ${intake.created_at}`);

      if (intake.answers) {
        const answers = typeof intake.answers === "string"
          ? JSON.parse(intake.answers)
          : intake.answers;
        console.log(`性別: ${answers.sex || "(なし)"}`);
        console.log(`生年月日: ${answers.birth || "(なし)"}`);
        console.log(`電話番号: ${answers.tel || "(なし)"}`);
      }
    }

    // 2. reservationsテーブルから予約情報を取得
    const { data: reservations, error: resvError } = await supabase
      .from("reservations")
      .select("*")
      .eq("patient_id", patientId)
      .order("reserved_date", { ascending: false });

    if (resvError) {
      console.error(`❌ Reservations Error:`, resvError);
    } else {
      console.log(`\n--- 予約 (${reservations.length}件) ---`);
      reservations.forEach(r => {
        console.log(`\n予約ID: ${r.reserve_id}`);
        console.log(`  予約日時: ${r.reserved_date} ${r.reserved_time}`);
        console.log(`  Status: ${r.status}`);
        console.log(`  作成日時: ${r.created_at}`);
        console.log(`  更新日時: ${r.updated_at}`);
      });
    }

    // 3. ordersテーブルから注文情報を取得
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error(`❌ Orders Error:`, ordersError);
    } else {
      console.log(`\n--- 注文 (${orders.length}件) ---`);
      if (orders.length > 0) {
        orders.forEach(o => {
          console.log(`\n注文ID: ${o.id}`);
          console.log(`  商品: ${o.product_code}`);
          console.log(`  金額: ${o.amount}円`);
          console.log(`  支払方法: ${o.payment_method}`);
          console.log(`  Status: ${o.status}`);
          console.log(`  作成日時: ${o.created_at}`);
        });
      } else {
        console.log("注文なし");
      }
    }

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
  }
}

checkPatient().catch(console.error);
