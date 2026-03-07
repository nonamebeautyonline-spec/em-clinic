import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { aggregateFormStats, type FormFieldDef } from "@/lib/form-stats";

// フォーム回答集計API
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // 期間フィルタ開始（ISO日付）
  const to = searchParams.get("to"); // 期間フィルタ終了（ISO日付）

  // フォーム情報取得
  const { data: form } = await withTenant(
    supabaseAdmin
      .from("forms")
      .select("id, name, fields")
      .eq("id", parseInt(id)),
    tenantId
  ).single();

  if (!form) return notFound("フォームが見つかりません");

  // 回答取得（ページネーションで1000行制限を回避）
  const allAnswers: Record<string, unknown>[] = [];
  let offset = 0;
  const pageSize = 5000;
  for (;;) {
    let query = withTenant(
      supabaseAdmin
        .from("form_responses")
        .select("answers, submitted_at")
        .eq("form_id", parseInt(id)),
      tenantId
    );

    // 期間フィルタ
    if (from) query = query.gte("submitted_at", from);
    if (to) query = query.lte("submitted_at", to + "T23:59:59.999Z");

    query = query.order("submitted_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: page, error: pageError } = await query;
    if (pageError) return serverError(pageError.message);
    if (!page || page.length === 0) break;

    for (const row of page) {
      if (row.answers && typeof row.answers === "object") {
        allAnswers.push(row.answers as Record<string, unknown>);
      }
    }

    if (page.length < pageSize) break;
    offset += pageSize;
  }

  // フィールド定義を取得
  const fields = ((form.fields || []) as FormFieldDef[]).filter(
    (f) => f.type !== "heading_sm" && f.type !== "heading_md"
  );

  // 集計
  const stats = aggregateFormStats(fields, allAnswers);

  return NextResponse.json({
    formName: form.name,
    ...stats,
  });
}
