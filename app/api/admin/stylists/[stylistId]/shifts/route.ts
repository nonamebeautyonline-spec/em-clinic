// app/api/admin/stylists/[stylistId]/shifts/route.ts — シフト管理 API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

type Params = { params: Promise<{ stylistId: string }> };

// GET: スタイリストのシフト一覧
export async function GET(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  try {
    const tenantId = resolveTenantIdOrThrow(req);
    const { stylistId } = await params;

    // スタイリストがテナントに属しているか確認
    const { data: stylist } = await strictWithTenant(
      supabaseAdmin.from("stylists").select("id"), tenantId
    ).eq("id", stylistId).single();
    if (!stylist) {
      return NextResponse.json({ ok: false, error: "スタイリストが見つかりません" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("stylist_shifts")
      .select("*")
      .eq("stylist_id", stylistId)
      .order("day_of_week", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, shifts: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    console.error("[stylist-shifts API] GET error:", msg);
    return serverError(msg);
  }
}

// PUT: 週間シフト一括更新（day_of_weekベース）
// body: { shifts: [{ day_of_week, start_time, end_time, is_available }] }
export async function PUT(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  try {
    const tenantId = resolveTenantIdOrThrow(req);
    const { stylistId } = await params;

    // スタイリストがテナントに属しているか確認
    const { data: stylist } = await strictWithTenant(
      supabaseAdmin.from("stylists").select("id"), tenantId
    ).eq("id", stylistId).single();
    if (!stylist) {
      return NextResponse.json({ ok: false, error: "スタイリストが見つかりません" }, { status: 404 });
    }

    const body = await req.json();
    const shifts: Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_available: boolean;
    }> = body.shifts || [];

    // 既存の週間シフト（specific_dateがnull）を削除して再作成
    await supabaseAdmin
      .from("stylist_shifts")
      .delete()
      .eq("stylist_id", stylistId)
      .is("specific_date", null);

    // 新しいシフトを挿入
    if (shifts.length > 0) {
      const rows = shifts.map((s) => ({
        stylist_id: stylistId,
        day_of_week: s.day_of_week,
        specific_date: null,
        start_time: s.start_time,
        end_time: s.end_time,
        is_available: s.is_available,
      }));
      const { error } = await supabaseAdmin.from("stylist_shifts").insert(rows);
      if (error) throw error;
    }

    // 更新後のシフトを返す
    const { data, error } = await supabaseAdmin
      .from("stylist_shifts")
      .select("*")
      .eq("stylist_id", stylistId)
      .order("day_of_week", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, shifts: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    console.error("[stylist-shifts API] PUT error:", msg);
    return serverError(msg);
  }
}
