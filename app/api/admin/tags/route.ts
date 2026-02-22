import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { tagCreateSchema } from "@/lib/validations/admin-operations";

// タグ一覧取得（各タグの患者数付き）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data: tagDefs, error } = await withTenant(
    supabaseAdmin
      .from("tag_definitions")
      .select("*")
      .order("created_at", { ascending: true }),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // タグごとの患者数を一括取得（ページネーション対応）
  const allPT: { tag_id: number }[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data: batch } = await withTenant(
      supabaseAdmin
        .from("patient_tags")
        .select("tag_id")
        .range(from, from + PAGE - 1),
      tenantId
    );
    if (!batch || batch.length === 0) break;
    allPT.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  const countMap = new Map<number, number>();
  for (const pt of allPT) {
    countMap.set(pt.tag_id, (countMap.get(pt.tag_id) || 0) + 1);
  }

  const tags = (tagDefs || []).map(t => ({
    ...t,
    patient_count: countMap.get(t.id) || 0,
  }));

  return NextResponse.json({ tags });
}

// タグ作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, tagCreateSchema);
  if ("error" in parsed) return parsed.error;
  const { name, color, description, is_auto, auto_rule } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("tag_definitions")
    .insert({ ...tenantPayload(tenantId), name: name.trim(), color: color || "#6B7280", description, is_auto: is_auto || false, auto_rule })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "同じ名前のタグが既に存在します" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tag: data });
}
