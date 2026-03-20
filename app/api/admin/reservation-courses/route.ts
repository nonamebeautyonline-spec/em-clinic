// app/api/admin/reservation-courses/route.ts — コース 一覧/作成
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { reservationCourseSchema } from "@/lib/validations/reservation-settings";
import { logAudit } from "@/lib/audit";

/** GET — コース一覧 */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("reservation_courses")
        .select("*")
        .order("sort_order")
        .order("created_at"),
      tenantId
    );

    if (error) {
      console.error("[reservation-courses] GET error:", error);
      return serverError("コースの取得に失敗しました");
    }

    return NextResponse.json({ ok: true, courses: data || [] });
  } catch (e) {
    console.error("[reservation-courses] GET error:", e);
    return serverError("コースの取得に失敗しました");
  }
}

/** POST — コース作成 */
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const parsed = await parseBody(req, reservationCourseSchema);
    if ("error" in parsed) return parsed.error;

    const { data, error } = await supabaseAdmin
      .from("reservation_courses")
      .insert({
        ...tenantPayload(tenantId),
        title: parsed.data.title,
        description: parsed.data.description || null,
        duration_minutes: parsed.data.duration_minutes,
        sort_order: parsed.data.sort_order,
        is_active: parsed.data.is_active,
      })
      .select()
      .single();

    if (error) {
      console.error("[reservation-courses] POST error:", error);
      return serverError("コースの作成に失敗しました");
    }

    logAudit(req, "reservation_course.create", "reservation_course", "unknown");
    return NextResponse.json({ ok: true, course: data });
  } catch (e) {
    console.error("[reservation-courses] POST error:", e);
    return serverError("コースの作成に失敗しました");
  }
}
