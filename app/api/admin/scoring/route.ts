// app/api/admin/scoring/route.ts — スコアリングルール CRUD
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, tenantPayload } from "@/lib/tenant";

// スコアリングルール一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await supabaseAdmin
    .from("scoring_rules")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[scoring] GET error:", error);
    return serverError("スコアリングルールの取得に失敗しました");
  }

  return NextResponse.json({ ok: true, rules: data ?? [] });
}

// スコアリングルール作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { name, event_type, score_value } = body;

  if (!name || !event_type || score_value == null) {
    return badRequest("名前・イベントタイプ・スコア値は必須です");
  }

  const { data, error } = await supabaseAdmin
    .from("scoring_rules")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      event_type,
      score_value,
    })
    .select()
    .single();

  if (error) {
    console.error("[scoring] POST error:", error);
    return serverError("スコアリングルールの作成に失敗しました");
  }

  return NextResponse.json({ ok: true, rule: data });
}

// スコアリングルール更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { id, name, event_type, score_value, is_active } = body;

  if (!id) {
    return badRequest("IDは必須です");
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (event_type !== undefined) updates.event_type = event_type;
  if (score_value !== undefined) updates.score_value = score_value;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabaseAdmin
    .from("scoring_rules")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    console.error("[scoring] PUT error:", error);
    return serverError("スコアリングルールの更新に失敗しました");
  }

  return NextResponse.json({ ok: true, rule: data });
}

// スコアリングルール削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return badRequest("IDは必須です");
  }

  const { error } = await supabaseAdmin
    .from("scoring_rules")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[scoring] DELETE error:", error);
    return serverError("スコアリングルールの削除に失敗しました");
  }

  return NextResponse.json({ ok: true });
}
