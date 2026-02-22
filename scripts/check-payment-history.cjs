const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const patientId = process.argv[2] || "20260201137";

  // 患者情報
  const { data: patient } = await supabase
    .from("patients")
    .select("patient_id, name, tel, line_id")
    .eq("patient_id", patientId)
    .single();

  if (patient) {
    console.log("=== 患者情報 ===");
    console.log("ID:", patient.patient_id);
    console.log("氏名:", patient.name);
    console.log("電話:", patient.tel);
    console.log("");
  }

  // 注文履歴
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, product_code, product_name, amount, paid_at, payment_method, payment_status, status, shipping_status, shipping_date, tracking_number, refund_status, refunded_amount, refunded_at, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  if (!orders || orders.length === 0) {
    console.log("決済歴なし");
    return;
  }

  console.log("=== 決済歴 (patient_id: " + patientId + ") ===");
  console.log("件数:", orders.length);
  console.log("");

  orders.forEach((o, i) => {
    console.log("--- #" + (i + 1) + " ---");
    console.log("注文ID:", o.id);
    console.log("商品:", o.product_name, "(" + o.product_code + ")");
    console.log("金額:", o.amount ? o.amount.toLocaleString() + "円" : "未設定");
    const method = o.payment_method === "credit_card" ? "クレジットカード" :
                   o.payment_method === "bank_transfer" ? "銀行振込" : o.payment_method;
    console.log("決済方法:", method);
    console.log("決済状態:", o.payment_status || o.status);
    console.log("決済日時:", o.paid_at || "未決済");
    console.log("配送状態:", o.shipping_status || "未設定");
    console.log("配送日:", o.shipping_date || "未設定");
    console.log("追跡番号:", o.tracking_number || "なし");
    if (o.refund_status) {
      console.log("返金状態:", o.refund_status);
      console.log("返金額:", o.refunded_amount ? o.refunded_amount.toLocaleString() + "円" : "未設定");
      console.log("返金日時:", o.refunded_at || "未設定");
    }
    console.log("作成日時:", o.created_at);
    console.log("");
  });
})();
