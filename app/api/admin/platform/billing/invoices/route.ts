// app/api/admin/platform/billing/invoices/route.ts
// 請求書一覧取得・新規作成API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { createInvoiceSchema } from "@/lib/validations/platform-billing";

/**
 * GET: 請求書一覧
 * クエリパラメータ:
 *   tenant_id - テナントIDフィルター
 *   status    - pending|paid|overdue|cancelled|all
 *   page      - ページ番号（1始まり）
 *   limit     - 1ページあたりの件数
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id") || "";
    const status = url.searchParams.get("status") || "all";
    const page = Math.max(
      1,
      parseInt(url.searchParams.get("page") || "1", 10),
    );
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)),
    );
    const offset = (page - 1) * limit;

    // billing_invoices LEFT JOIN tenants
    let query = supabaseAdmin
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
        updated_at,
        tenants!left (
          id,
          name,
          slug
        )
      `,
        { count: "exact" },
      );

    // テナントIDフィルター
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    // ステータスフィルター
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // 並び順: 作成日降順
    query = query.order("created_at", { ascending: false });

    // ページネーション
    query = query.range(offset, offset + limit - 1);

    const { data: invoices, error: invoicesErr, count } = await query;

    if (invoicesErr) {
      console.error("[platform/billing/invoices] GET error:", invoicesErr);
      return NextResponse.json(
        { ok: false, error: "請求書一覧の取得に失敗しました" },
        { status: 500 },
      );
    }

    // KPI用の集計データも返す
    // 今月の請求総額・未収金額・入金済み額
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthEnd = nextMonth.toISOString().split("T")[0];

    // 今月の請求書を取得して集計
    const { data: monthlyInvoices } = await supabaseAdmin
      .from("billing_invoices")
      .select("amount, tax_amount, status")
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd);

    let totalBilled = 0;
    let totalPending = 0;
    let totalPaid = 0;

    if (monthlyInvoices) {
      for (const inv of monthlyInvoices) {
        const total = (inv.amount || 0) + (inv.tax_amount || 0);
        totalBilled += total;
        if (inv.status === "paid") {
          totalPaid += total;
        } else if (inv.status === "pending" || inv.status === "overdue") {
          totalPending += total;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      invoices: invoices || [],
      kpi: {
        totalBilled,
        totalPending,
        totalPaid,
      },
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("[platform/billing/invoices] GET unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}

/**
 * POST: 請求書新規作成
 */
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  // バリデーション
  const parsed = await parseBody(req, createInvoiceSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;

  try {
    // テナントの存在確認
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, name")
      .eq("id", data.tenantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    // テナントのプランIDを取得（任意）
    const { data: plan } = await supabaseAdmin
      .from("tenant_plans")
      .select("id")
      .eq("tenant_id", data.tenantId)
      .maybeSingle();

    // 請求書を作成
    const { data: invoice, error: invoiceErr } = await supabaseAdmin
      .from("billing_invoices")
      .insert({
        tenant_id: data.tenantId,
        plan_id: plan?.id || null,
        amount: data.amount,
        tax_amount: data.taxAmount,
        billing_period_start: data.billingPeriodStart,
        billing_period_end: data.billingPeriodEnd,
        status: "pending",
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (invoiceErr) {
      console.error("[platform/billing/invoices] POST error:", invoiceErr);
      return NextResponse.json(
        { ok: false, error: "請求書の作成に失敗しました" },
        { status: 500 },
      );
    }

    // 監査ログ（fire-and-forget）
    logAudit(req, "create_invoice", "billing_invoice", invoice.id, {
      tenantId: data.tenantId,
      tenantName: tenant.name,
      amount: data.amount,
      taxAmount: data.taxAmount,
      billingPeriod: `${data.billingPeriodStart} ~ ${data.billingPeriodEnd}`,
    });

    return NextResponse.json(
      {
        ok: true,
        invoice,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[platform/billing/invoices] POST unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
