// app/api/admin/line/ab-test/[id]/route.ts — ABテスト個別操作API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateAbTestSchema } from "@/lib/validations/line-broadcast";
import { determineWinner, type VariantStats } from "@/lib/ab-test-stats";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET: ABテスト詳細取得（バリアント・統計情報含む）
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await ctx.params;

  const { data: test, error } = await withTenant(
    supabaseAdmin
      .from("ab_tests")
      .select("*, ab_test_variants(*)")
      .eq("id", id),
    tenantId,
  ).single();

  if (error || !test) {
    return NextResponse.json({ error: "ABテストが見つかりません" }, { status: 404 });
  }

  // バリアントデータから勝者判定を実施
  const variants: VariantStats[] = (test.ab_test_variants || []).map((v: any) => ({
    id: v.id,
    name: v.name,
    sent_count: v.sent_count || 0,
    open_count: v.open_count || 0,
    click_count: v.click_count || 0,
    conversion_count: v.conversion_count || 0,
  }));

  const winnerResult = variants.length >= 2
    ? determineWinner(variants, test.winner_criteria)
    : null;

  return NextResponse.json({
    test,
    stats: winnerResult,
  });
}

/**
 * PUT: ABテスト更新（ステータス変更・勝者選定・バリアント更新）
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await ctx.params;
  const parsed = await parseBody(req, updateAbTestSchema);
  if ("error" in parsed) return parsed.error;

  const { status, winner_variant_id, variants, ...updateFields } = parsed.data;

  // 現在のテスト取得
  const { data: existing } = await withTenant(
    supabaseAdmin.from("ab_tests").select("*").eq("id", id),
    tenantId,
  ).single();

  if (!existing) {
    return NextResponse.json({ error: "ABテストが見つかりません" }, { status: 404 });
  }

  // ステータス遷移のバリデーション
  if (status) {
    const validTransitions: Record<string, string[]> = {
      draft: ["running", "cancelled"],
      running: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };
    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `ステータスを ${existing.status} から ${status} に変更できません` },
        { status: 400 },
      );
    }
  }

  // 更新データ組み立て
  const updateData: Record<string, any> = { ...updateFields, updated_at: new Date().toISOString() };
  if (status) {
    updateData.status = status;
    if (status === "running") {
      updateData.started_at = new Date().toISOString();
    }
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }
  }
  if (winner_variant_id !== undefined) {
    updateData.winner_variant_id = winner_variant_id;
  }

  // 自動勝者選定（completed時）
  if (status === "completed" && existing.auto_select_winner && !winner_variant_id) {
    const { data: variantData } = await supabaseAdmin
      .from("ab_test_variants")
      .select("*")
      .eq("ab_test_id", id);

    if (variantData && variantData.length >= 2) {
      const variantStats: VariantStats[] = variantData.map((v: any) => ({
        id: v.id,
        name: v.name,
        sent_count: v.sent_count || 0,
        open_count: v.open_count || 0,
        click_count: v.click_count || 0,
        conversion_count: v.conversion_count || 0,
      }));
      const result = determineWinner(variantStats, existing.winner_criteria);
      if (result.winnerId) {
        updateData.winner_variant_id = result.winnerId;
      }
    }
  }

  const { data: updated, error: updateError } = await withTenant(
    supabaseAdmin.from("ab_tests").update(updateData).eq("id", id),
    tenantId,
  ).select().single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // バリアントの更新（指定された場合）
  if (variants && variants.length > 0) {
    for (const v of variants) {
      if (v.id) {
        const variantUpdate: Record<string, any> = {};
        if (v.name !== undefined) variantUpdate.name = v.name;
        if (v.template_id !== undefined) variantUpdate.template_id = v.template_id;
        if (v.message_content !== undefined) variantUpdate.message_content = v.message_content;
        if (v.message_type !== undefined) variantUpdate.message_type = v.message_type;
        if (v.allocation_ratio !== undefined) variantUpdate.allocation_ratio = v.allocation_ratio;

        if (Object.keys(variantUpdate).length > 0) {
          await supabaseAdmin
            .from("ab_test_variants")
            .update(variantUpdate)
            .eq("id", v.id)
            .eq("ab_test_id", id);
        }
      }
    }
  }

  // 更新後のテスト全体を取得して返す
  const { data: result } = await withTenant(
    supabaseAdmin.from("ab_tests").select("*, ab_test_variants(*)").eq("id", id),
    tenantId,
  ).single();

  return NextResponse.json({ test: result || updated });
}

/**
 * DELETE: ABテスト削除
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await ctx.params;

  // 実行中のテストは削除不可
  const { data: existing } = await withTenant(
    supabaseAdmin.from("ab_tests").select("status").eq("id", id),
    tenantId,
  ).single();

  if (!existing) {
    return NextResponse.json({ error: "ABテストが見つかりません" }, { status: 404 });
  }
  if (existing.status === "running") {
    return NextResponse.json(
      { error: "実行中のテストは削除できません。先にキャンセルしてください。" },
      { status: 400 },
    );
  }

  // CASCADE で ab_test_variants も削除される
  const { error } = await withTenant(
    supabaseAdmin.from("ab_tests").delete().eq("id", id),
    tenantId,
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
