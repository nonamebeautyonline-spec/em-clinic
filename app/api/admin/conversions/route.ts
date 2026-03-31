// app/api/admin/conversions/route.ts — コンバージョンポイント CRUD + CV数取得
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, tenantPayload } from "@/lib/tenant";

// コンバージョンポイント一覧取得（イベント数付き）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  // コンバージョンポイント定義を取得
  const { data: points, error } = await supabaseAdmin
    .from("conversion_points")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[conversions] GET error:", error);
    return serverError("コンバージョンポイントの取得に失敗しました");
  }

  if (!points || points.length === 0) {
    return NextResponse.json({ ok: true, points: [] });
  }

  // 各ポイントのイベント数を集計
  const pointIds = points.map((p) => p.id);
  const { data: events, error: evError } = await supabaseAdmin
    .from("conversion_events")
    .select("conversion_point_id")
    .eq("tenant_id", tenantId)
    .in("conversion_point_id", pointIds);

  if (evError) {
    console.error("[conversions] イベント数取得エラー:", evError);
  }

  // ポイントIDごとのイベント数マップ
  const countMap = new Map<string, number>();
  if (events) {
    for (const ev of events) {
      const id = ev.conversion_point_id;
      countMap.set(id, (countMap.get(id) || 0) + 1);
    }
  }

  const result = points.map((p) => ({
    ...p,
    event_count: countMap.get(p.id) || 0,
  }));

  return NextResponse.json({ ok: true, points: result });
}

// コンバージョンポイント作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { name, event_type, value } = body;

  if (!name || !event_type) {
    return badRequest("名前とイベントタイプは必須です");
  }

  const { data, error } = await supabaseAdmin
    .from("conversion_points")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      event_type,
      value: value ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[conversions] POST error:", error);
    return serverError("コンバージョンポイントの作成に失敗しました");
  }

  return NextResponse.json({ ok: true, point: data });
}

// コンバージョンポイント削除
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
    .from("conversion_points")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[conversions] DELETE error:", error);
    return serverError("コンバージョンポイントの削除に失敗しました");
  }

  return NextResponse.json({ ok: true });
}
