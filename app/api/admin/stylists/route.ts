// app/api/admin/stylists/route.ts — スタイリスト CRUD API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, tenantPayload } from "@/lib/tenant";

// GET: スタイリスト一覧（シフト含む）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  try {
    const tenantId = resolveTenantIdOrThrow(req);
    const { data, error } = await supabaseAdmin
      .from("stylists")
      .select("*, stylist_shifts(*)")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, stylists: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    console.error("[stylists API] GET error:", msg);
    return serverError(msg);
  }
}

// POST: スタイリスト新規作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  try {
    const tenantId = resolveTenantIdOrThrow(req);
    const body = await req.json();
    const { name, display_name, photo_url, specialties } = body;
    if (!name) return badRequest("名前は必須です");

    // sort_orderは末尾に追加
    const { data: maxOrder } = await supabaseAdmin
      .from("stylists")
      .select("sort_order")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabaseAdmin
      .from("stylists")
      .insert({
        ...tenantPayload(tenantId),
        name,
        display_name: display_name || null,
        photo_url: photo_url || null,
        specialties: specialties || [],
        sort_order: (maxOrder?.sort_order ?? -1) + 1,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, stylist: data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    console.error("[stylists API] POST error:", msg);
    return serverError(msg);
  }
}
