// app/api/admin/bank-transfer/statements/link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized, serverError } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 入出金明細と注文を手動紐づけAPI
 * POST /api/admin/bank-transfer/statements/link
 * body: { statementId: number, orderId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantId(req);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { statementId, statementIds, orderId } = body;

    // 複数ID対応（statementIds優先、なければstatementIdを単体配列に）
    const ids: number[] = statementIds || (statementId ? [statementId] : []);

    if (ids.length === 0 || !orderId) {
      return badRequest("statementId(s)とorderIdが必要です");
    }

    // 注文の存在確認
    const { data: order } = await withTenant(
      supabase.from("orders").select("id, status").eq("id", orderId),
      tenantId
    );

    if (!order || order.length === 0) {
      return badRequest("指定された注文が見つかりません");
    }

    // bank_statementsを一括更新
    const { error } = await withTenant(
      supabase
        .from("bank_statements")
        .update({ reconciled: true, matched_order_id: orderId })
        .in("id", ids),
      tenantId
    );

    if (error) {
      console.error("[Statements/link] update error:", error);
      return serverError(error.message);
    }

    return NextResponse.json({ ok: true, linkedCount: ids.length });
  } catch (e) {
    console.error("[Statements/link] error:", e);
    return serverError(e instanceof Error ? e.message : "サーバーエラー");
  }
}
