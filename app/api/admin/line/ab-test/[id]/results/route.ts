// app/api/admin/line/ab-test/[id]/results/route.ts — ABテスト結果集計API
import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { determineWinner, type VariantStats } from "@/lib/ab-test-stats";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET: ABテスト結果集計
 *
 * バリアントごとの送信数・開封率・クリック率・CV率を返す
 * + 統計的有意差判定 + 勝者ハイライト
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id: testId } = await ctx.params;

  // テスト取得
  const { data: test, error: testErr } = await strictWithTenant(
    supabaseAdmin.from("ab_tests").select("*").eq("id", testId),
    tenantId,
  ).single();

  if (testErr || !test) return notFound("ABテストが見つかりません");

  // バリアント取得
  const { data: variants, error: vErr } = await supabaseAdmin
    .from("ab_test_variants")
    .select("*")
    .eq("ab_test_id", testId)
    .order("created_at", { ascending: true });

  if (vErr) return serverError(vErr.message);
  if (!variants || variants.length === 0) {
    return NextResponse.json({ test, variants: [], stats: null, assignments_count: 0 });
  }

  // 割り当て数を取得
  const { count: assignmentsCount } = await supabaseAdmin
    .from("ab_test_assignments")
    .select("id", { count: "exact", head: true })
    .eq("test_id", testId);

  // バリアントごとの詳細統計
  const variantResults = variants.map((v: Record<string, unknown>) => {
    const sentCount = Number(v.sent_count) || 0;
    const openCount = Number(v.open_count) || 0;
    const clickCount = Number(v.click_count) || 0;
    const conversionCount = Number(v.conversion_count) || 0;

    return {
      id: String(v.id),
      name: String(v.name),
      allocation_ratio: Number(v.allocation_ratio),
      sent_count: sentCount,
      open_count: openCount,
      click_count: clickCount,
      conversion_count: conversionCount,
      open_rate: sentCount > 0 ? Math.round((openCount / sentCount) * 1000) / 10 : 0,
      click_rate: sentCount > 0 ? Math.round((clickCount / sentCount) * 1000) / 10 : 0,
      conversion_rate: sentCount > 0 ? Math.round((conversionCount / sentCount) * 1000) / 10 : 0,
    };
  });

  // 勝者判定
  const variantStats: VariantStats[] = variantResults.map((v) => ({
    id: v.id,
    name: v.name,
    sent_count: v.sent_count,
    open_count: v.open_count,
    click_count: v.click_count,
    conversion_count: v.conversion_count,
  }));

  const winnerResult = variantStats.length >= 2
    ? determineWinner(variantStats, test.winner_criteria)
    : null;

  return NextResponse.json({
    test,
    variants: variantResults,
    stats: winnerResult,
    assignments_count: assignmentsCount || 0,
  });
}
