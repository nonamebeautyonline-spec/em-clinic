// app/api/admin/reservation-slots/[id]/courses/route.ts — 予約枠×コースリンク設定
// tenant_id は親テーブル reservation_slots / reservation_courses 経由でテナント分離
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, badRequest } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { slotCourseLinksSchema } from "@/lib/validations/reservation-settings";

type Params = { params: Promise<{ id: string }> };

/** GET — 予約枠に紐づくコース一覧 */
export async function GET(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id } = await params;
  if (!id) return badRequest("idは必須です");

  try {
    const { data, error } = await supabaseAdmin
      .from("slot_course_links")
      .select("course_id")
      .eq("slot_id", id);

    if (error) {
      console.error("[slot-courses] GET error:", error);
      return serverError("取得に失敗しました");
    }

    return NextResponse.json({
      ok: true,
      course_ids: (data || []).map((d: { course_id: string }) => d.course_id),
    });
  } catch (e) {
    console.error("[slot-courses] GET error:", e);
    return serverError("取得に失敗しました");
  }
}

/** PUT — 予約枠のコースリンクを一括更新（delete + insert） */
export async function PUT(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("idは必須です");

  try {
    const parsed = await parseBody(req, slotCourseLinksSchema);
    if ("error" in parsed) return parsed.error;

    // 既存リンクを削除
    await supabaseAdmin.from("slot_course_links").delete().eq("slot_id", id);

    // 新規リンクを挿入
    if (parsed.data.course_ids.length > 0) {
      const links = parsed.data.course_ids.map((courseId: string) => ({
        slot_id: id,
        course_id: courseId,
      }));

      const { error } = await supabaseAdmin
        .from("slot_course_links")
        .insert(links);

      if (error) {
        console.error("[slot-courses] PUT insert error:", error);
        return serverError("リンクの保存に失敗しました");
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[slot-courses] PUT error:", e);
    return serverError("リンクの保存に失敗しました");
  }
}
