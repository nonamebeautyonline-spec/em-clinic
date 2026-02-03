import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

const paymentId = "1wf4t5lV6uSPYvXbgmHtNB79ArBZY";

console.log("=== 返金注文の確認 ===");
console.log(`Payment ID: ${paymentId}\n`);

// 1. ordersテーブルの情報
console.log("【1. ordersテーブル】");
const { data: order, error: orderError } = await supabase
  .from("orders")
  .select("*")
  .eq("id", paymentId)
  .single();

if (orderError) {
  console.error("エラー:", orderError);
} else if (order) {
  console.log("注文情報:");
  console.log(`  ID: ${order.id}`);
  console.log(`  patient_id: ${order.patient_id}`);
  console.log(`  product_code: ${order.product_code}`);
  console.log(`  amount: ${order.amount ? order.amount.toLocaleString() + "円" : "(null)"}`);
  console.log(`  payment_method: ${order.payment_method}`);
  console.log(`  status: ${order.status}`);
  console.log(`  refunded_at: ${order.refunded_at || "(null)"}`);
  console.log(`  created_at: ${order.created_at}`);
  console.log(`  paid_at: ${order.paid_at || "(null)"}`);
  console.log(`  updated_at: ${order.updated_at || "(null)"}`);

  const patientId = order.patient_id;

  // 2. 該当患者の全注文
  console.log("\n【2. 該当患者の全注文】");
  const { data: patientOrders, error: patientOrdersError } = await supabase
    .from("orders")
    .select("id, product_code, amount, status, payment_method, created_at, paid_at, refunded_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (patientOrdersError) {
    console.error("エラー:", patientOrdersError);
  } else {
    console.log(`患者 ${patientId} の全注文: ${patientOrders?.length || 0}件\n`);
    patientOrders?.forEach((o, idx) => {
      console.log(`[${idx + 1}] ${o.id}`);
      console.log(`    product: ${o.product_code}, amount: ${o.amount?.toLocaleString()}円`);
      console.log(`    method: ${o.payment_method}, status: ${o.status}`);
      console.log(`    created: ${o.created_at}`);
      console.log(`    paid: ${o.paid_at || "(null)"}`);
      console.log(`    refunded: ${o.refunded_at || "(null)"}`);
      console.log();
    });
  }

  // 3. patientsテーブルの情報
  console.log("【3. patientsテーブル】");
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .single();

  if (patientError) {
    console.error("エラー:", patientError);
  } else if (patient) {
    console.log(`患者名: ${patient.name_sei} ${patient.name_mei}`);
    console.log(`カナ: ${patient.name_sei_kana} ${patient.name_mei_kana}`);
    console.log(`LINE ID: ${patient.line_user_id || "(未連携)"}`);
    console.log(`created_at: ${patient.created_at}`);
  }

  // 4. intakeテーブルの情報
  console.log("\n【4. intakeテーブル】");
  const { data: intake, error: intakeError } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .single();

  if (intakeError) {
    console.error("エラー:", intakeError);
  } else if (intake) {
    console.log(`問診ステータス: ${intake.status}`);
    console.log(`created_at: ${intake.created_at}`);
    console.log(`updated_at: ${intake.updated_at || "(null)"}`);
  }

  // 5. reservationsテーブルの情報
  console.log("\n【5. reservationsテーブル】");
  const { data: reservations, error: reservationsError } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", patientId)
    .order("reserved_date", { ascending: false });

  if (reservationsError) {
    console.error("エラー:", reservationsError);
  } else {
    console.log(`予約数: ${reservations?.length || 0}件\n`);
    reservations?.forEach((r, idx) => {
      console.log(`[${idx + 1}] reserve_id: ${r.reserve_id}`);
      console.log(`    reserved_date: ${r.reserved_date}`);
      console.log(`    reserved_time: ${r.reserved_time}`);
      console.log(`    status: ${r.status}`);
      console.log(`    created_at: ${r.created_at}`);
      console.log();
    });
  }

  // 6. マイページAPIをテスト（キャッシュ確認）
  console.log("【6. マイページAPI確認】");
  console.log("マイページAPIを確認するには、以下のコマンドを実行してください:");
  console.log(`curl -X POST http://localhost:3000/api/patient/mypage \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"patient_id": "${patientId}"}'`);
  console.log();
  console.log("または本番環境:");
  console.log(`curl -X POST https://your-domain.vercel.app/api/patient/mypage \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"patient_id": "${patientId}"}'`);

} else {
  console.log("注文が見つかりません");
}
