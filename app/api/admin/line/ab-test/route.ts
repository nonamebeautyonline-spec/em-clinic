// app/api/admin/line/ab-test/route.ts — ABテスト管理API（一覧・新規作成）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { createAbTestSchema } from "@/lib/validations/line-broadcast";

/**
 * GET: ABテスト一覧取得
 */
export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  // ABテスト一覧取得（バリアント含む）
  const { data, error } = await withTenant(
    supabaseAdmin
      .from("ab_tests")
      .select("*, ab_test_variants(*)")
      .order("created_at", { ascending: false }),
    tenantId,
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tests: data || [] });
}

/**
 * POST: ABテスト新規作成（バリアント含む）
 */
export async function POST(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, createAbTestSchema);
  if ("error" in parsed) return parsed.error;

  const { name, target_segment, winner_criteria, auto_select_winner, min_sample_size, variants } =
    parsed.data;

  // 配分比率の合計チェック
  const totalRatio = variants.reduce((sum, v) => sum + (v.allocation_ratio ?? 50), 0);
  if (totalRatio !== 100) {
    return NextResponse.json(
      { error: `配分比率の合計は100%である必要があります（現在: ${totalRatio}%）` },
      { status: 400 },
    );
  }

  // ABテストレコード作成
  const { data: test, error: testError } = await supabaseAdmin
    .from("ab_tests")
    .insert({
      ...tenantPayload(tenantId),
      name,
      target_segment: target_segment || null,
      winner_criteria: winner_criteria || "open_rate",
      auto_select_winner: auto_select_winner ?? true,
      min_sample_size: min_sample_size || 100,
    })
    .select()
    .single();

  if (testError || !test) {
    return NextResponse.json(
      { error: testError?.message || "ABテスト作成に失敗しました" },
      { status: 500 },
    );
  }

  // バリアントレコード作成
  const variantInserts = variants.map((v) => ({
    ab_test_id: test.id,
    name: v.name,
    template_id: v.template_id || null,
    message_content: v.message_content || null,
    message_type: v.message_type || "text",
    allocation_ratio: v.allocation_ratio ?? 50,
  }));

  const { data: createdVariants, error: variantError } = await supabaseAdmin
    .from("ab_test_variants")
    .insert(variantInserts)
    .select();

  if (variantError) {
    // テストレコードも削除（ロールバック）
    await supabaseAdmin.from("ab_tests").delete().eq("id", test.id);
    return NextResponse.json(
      { error: variantError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    test: { ...test, ab_test_variants: createdVariants },
  });
}
