// app/api/admin/platform/billing/invoices/[invoiceId]/route.ts
// 請求書ステータス更新API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { updateInvoiceStatusSchema } from "@/lib/validations/platform-billing";

/**
 * PATCH: 請求書ステータス更新
 * pending → paid 等のステータス変更
 * status が 'paid' の場合、paid_at を自動セット
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  const { invoiceId } = await params;

  // バリデーション
  const parsed = await parseBody(req, updateInvoiceStatusSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;

  try {
    // 請求書の存在確認
    const { data: existing } = await supabaseAdmin
      .from("billing_invoices")
      .select("id, tenant_id, status, amount")
      .eq("id", invoiceId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "請求書が見つかりません" },
        { status: 404 },
      );
    }

    // 更新データを構築
    const updateData: Record<string, unknown> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };

    // paid の場合は paid_at を自動セット（明示的に指定がなければ現在時刻）
    if (data.status === "paid") {
      updateData.paid_at = data.paidAt || new Date().toISOString();
    } else if (!data.paidAt) {
      // paid 以外に変更する場合は paid_at をクリア
      updateData.paid_at = null;
    }

    const { data: invoice, error: updateErr } = await supabaseAdmin
      .from("billing_invoices")
      .update(updateData)
      .eq("id", invoiceId)
      .select()
      .single();

    if (updateErr) {
      console.error(
        "[platform/billing/invoices] PATCH error:",
        updateErr,
      );
      return NextResponse.json(
        { ok: false, error: "請求書の更新に失敗しました" },
        { status: 500 },
      );
    }

    // 監査ログ（fire-and-forget）
    logAudit(req, "update_invoice_status", "billing_invoice", invoiceId, {
      tenantId: existing.tenant_id,
      previousStatus: existing.status,
      newStatus: data.status,
      amount: existing.amount,
    });

    return NextResponse.json({
      ok: true,
      invoice,
    });
  } catch (err) {
    console.error(
      "[platform/billing/invoices] PATCH unexpected error:",
      err,
    );
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
