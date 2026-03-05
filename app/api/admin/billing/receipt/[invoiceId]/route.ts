// app/api/admin/billing/receipt/[invoiceId]/route.ts
// 領収書PDF発行API: 支払済み請求書の領収書PDFをダウンロード

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { getPlanByKey } from "@/lib/plan-config";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ error: "テナントが特定できません" }, { status: 400 });
  }

  const { invoiceId } = await params;

  try {
    // 請求書取得（テナント所有権チェック込み）
    const { data: invoice, error } = await supabaseAdmin
      .from("billing_invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });
    }

    // 支払済みのみ領収書発行可能
    if (invoice.status !== "paid") {
      return NextResponse.json(
        { error: "未払いの請求書には領収書を発行できません" },
        { status: 400 },
      );
    }

    // テナント情報取得
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();

    // プラン名取得
    const { data: plan } = await supabaseAdmin
      .from("tenant_plans")
      .select("plan_name")
      .eq("tenant_id", tenantId)
      .single();

    const planConfig = plan ? getPlanByKey(plan.plan_name) : null;

    // PDF生成
    const pdfBuffer = generateInvoicePDF({
      invoiceNumber: invoice.invoice_number || `RCP-${invoice.id.slice(0, 8)}`,
      tenantName: tenant?.name || "Unknown",
      tenantEmail: "",
      billingPeriodStart: formatDateShort(invoice.billing_period_start),
      billingPeriodEnd: formatDateShort(invoice.billing_period_end),
      amount: invoice.amount || 0,
      taxAmount: invoice.tax_amount || 0,
      totalAmount: invoice.total_amount || 0,
      planName: planConfig?.label || plan?.plan_name || "Standard",
      status: "RECEIPT",
      issuedAt: formatDateShort(new Date().toISOString()),
      paidAt: invoice.paid_at ? formatDateShort(invoice.paid_at) : null,
      notes: invoice.notes || null,
    });

    // PDFレスポンス（BufferをUint8Arrayに変換）
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${invoice.invoice_number || invoiceId}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[admin/billing/receipt] error:", err);
    return NextResponse.json({ ok: false, error: "領収書生成に失敗しました" }, { status: 500 });
  }
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return "-";
  }
}
