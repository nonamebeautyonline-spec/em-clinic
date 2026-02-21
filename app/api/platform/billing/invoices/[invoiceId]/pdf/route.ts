// app/api/platform/billing/invoices/[invoiceId]/pdf/route.ts
// 請求書PDFダウンロードAPI

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { generateInvoicePDF } from "@/lib/invoice-pdf";

// プラン名の表示ラベル
const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  standard: "Standard",
  premium: "Premium",
  enterprise: "Enterprise",
};

/**
 * GET: 請求書PDFダウンロード
 * billing_invoices + tenants + tenant_plans をJOINして取得し、PDFを生成して返す
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  // プラットフォーム管理者認証
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );
  }

  const { invoiceId } = await params;

  try {
    // 請求書データ取得（テナント情報もJOIN）
    const { data: invoice, error: invoiceErr } = await supabaseAdmin
      .from("billing_invoices")
      .select(
        `
        id,
        tenant_id,
        plan_id,
        amount,
        tax_amount,
        billing_period_start,
        billing_period_end,
        status,
        paid_at,
        notes,
        created_at,
        tenants!left (
          id,
          name,
          slug,
          contact_email
        )
      `,
      )
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceErr) {
      console.error("[platform/billing/invoices/pdf] GET error:", invoiceErr);
      return NextResponse.json(
        { ok: false, error: "請求書の取得に失敗しました" },
        { status: 500 },
      );
    }

    if (!invoice) {
      return NextResponse.json(
        { ok: false, error: "請求書が見つかりません" },
        { status: 404 },
      );
    }

    // テナントのプラン名を取得
    let planName = "Standard";
    if (invoice.plan_id) {
      const { data: plan } = await supabaseAdmin
        .from("tenant_plans")
        .select("plan_name")
        .eq("id", invoice.plan_id)
        .maybeSingle();

      if (plan?.plan_name) {
        planName = PLAN_LABELS[plan.plan_name] || plan.plan_name;
      }
    }

    // テナント情報の取得（JOINの結果。Supabase !left は配列で返る場合がある）
    const tenantsRaw = invoice.tenants;
    const tenant = (
      Array.isArray(tenantsRaw) ? tenantsRaw[0] : tenantsRaw
    ) as {
      id: string;
      name: string;
      slug: string;
      contact_email: string | null;
    } | null;

    // 請求書番号: INV-{invoiceIdの先頭8文字}
    const invoiceNumber = `INV-${invoice.id.substring(0, 8).toUpperCase()}`;

    // 日付フォーマット（YYYY-MM-DD）
    const formatDate = (isoString: string | null): string => {
      if (!isoString) return "-";
      return isoString.split("T")[0];
    };

    // PDF生成
    const pdfBuffer = generateInvoicePDF({
      invoiceNumber,
      tenantName: tenant?.name || "Unknown",
      tenantEmail: tenant?.contact_email || "",
      billingPeriodStart: formatDate(invoice.billing_period_start),
      billingPeriodEnd: formatDate(invoice.billing_period_end),
      amount: invoice.amount,
      taxAmount: invoice.tax_amount,
      totalAmount: invoice.amount + invoice.tax_amount,
      planName,
      status: invoice.status,
      issuedAt: formatDate(invoice.created_at),
      paidAt: invoice.paid_at ? formatDate(invoice.paid_at) : null,
      notes: invoice.notes,
    });

    // PDFレスポンス（BufferをUint8Arrayに変換してNextResponse互換にする）
    const body = new Uint8Array(pdfBuffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.id}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error(
      "[platform/billing/invoices/pdf] GET unexpected error:",
      err,
    );
    return NextResponse.json(
      { ok: false, error: "PDF生成中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
