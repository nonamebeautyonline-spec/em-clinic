// 再配送料の銀行振込注文作成API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized, forbidden, conflict, serverError } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPatientSession } from "@/lib/patient-session";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await verifyPatientSession(req);
  if (!session) return unauthorized();
  const { patientId } = session;

  const tenantId = resolveTenantId(req);

  let body: { redeliveryId?: number };
  try {
    body = await req.json();
  } catch {
    return badRequest("不正なリクエストです");
  }

  const { redeliveryId } = body;
  if (!redeliveryId) return badRequest("redeliveryId は必須です");

  // 再配送請求の存在・所有者確認
  const { data: rd } = await withTenant(
    supabaseAdmin
      .from("redeliveries")
      .select("id, patient_id, original_order_id, amount, status")
      .eq("id", redeliveryId)
      .maybeSingle(),
    tenantId
  );

  if (!rd) return badRequest("再配送請求が見つかりません");
  if (rd.patient_id !== patientId) return forbidden("この請求へのアクセス権がありません");
  if (rd.status !== "pending") return conflict("この再配送料は既に処理済みです");

  // 元注文の配送先情報を取得
  const { data: origOrder } = await withTenant(
    supabaseAdmin
      .from("orders")
      .select("shipping_name, postal_code, address, phone, email")
      .eq("id", rd.original_order_id)
      .maybeSingle(),
    tenantId
  );

  const now = new Date().toISOString();
  const orderId = `bt_redelivery_${redeliveryId}_${Date.now()}`;

  // ordersにINSERT（振込確認待ち）
  const { error } = await supabaseAdmin.from("orders").insert({
    ...tenantPayload(tenantId),
    id: orderId,
    patient_id: patientId,
    product_code: "REDELIVERY_FEE",
    product_name: "再配送料",
    amount: rd.amount,
    payment_method: "bank_transfer",
    payment_status: "PENDING",
    status: "pending_confirmation",
    shipping_status: "pending",
    shipping_name: origOrder?.shipping_name || "",
    postal_code: origOrder?.postal_code || "",
    address: origOrder?.address || "",
    phone: origOrder?.phone || "",
    email: origOrder?.email || "",
    created_at: now,
  });

  if (error) {
    console.error("[redelivery/bank-transfer] INSERT失敗:", error.message);
    return serverError("注文の作成に失敗しました");
  }

  // redeliveriesにpaid_order_idを紐付け（statusはまだpendingのまま、入金確認後にpaidに変更）
  await withTenant(
    supabaseAdmin
      .from("redeliveries")
      .update({ paid_order_id: orderId })
      .eq("id", redeliveryId),
    tenantId
  );

  return NextResponse.json({ ok: true, orderId });
}
