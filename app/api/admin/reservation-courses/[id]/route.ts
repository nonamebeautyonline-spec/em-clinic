// app/api/admin/reservation-courses/[id]/route.ts — コース 更新/削除
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, badRequest } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { reservationCourseSchema } from "@/lib/validations/reservation-settings";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

/** PUT — コース更新 */
export async function PUT(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("idは必須です");

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const parsed = await parseBody(req, reservationCourseSchema.partial());
    if ("error" in parsed) return parsed.error;

    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("reservation_courses")
        .update({
          ...parsed.data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id),
      tenantId
    ).select().single();

    if (error) {
      console.error("[reservation-courses] PUT error:", error);
      return serverError("コースの更新に失敗しました");
    }

    logAudit(req, "reservation_course.update", "reservation_course", String(id));
    return NextResponse.json({ ok: true, course: data });
  } catch (e) {
    console.error("[reservation-courses] PUT error:", e);
    return serverError("コースの更新に失敗しました");
  }
}

/** DELETE — コース削除（論理削除: is_active=false） */
export async function DELETE(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("idは必須です");

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { error } = await strictWithTenant(
      supabaseAdmin
        .from("reservation_courses")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id),
      tenantId
    );

    if (error) {
      console.error("[reservation-courses] DELETE error:", error);
      return serverError("コースの削除に失敗しました");
    }

    logAudit(req, "reservation_course.delete", "reservation_course", String(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reservation-courses] DELETE error:", e);
    return serverError("コースの削除に失敗しました");
  }
}
