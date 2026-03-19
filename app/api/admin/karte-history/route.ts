// app/api/admin/karte-history/route.ts — カルテ編集履歴一覧API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/** カルテ編集履歴を取得（?intakeId=xxx） */
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req);
    const { searchParams } = new URL(req.url);
    const intakeId = searchParams.get("intakeId");

    if (!intakeId) {
      return NextResponse.json({ error: "intakeIdは必須です" }, { status: 400 });
    }

    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("karte_history")
        .select("id, intake_id, note_before, note_after, karte_status_before, karte_status_after, change_reason, changed_by, changed_by_id, changed_at")
        .eq("intake_id", Number(intakeId))
        .order("changed_at", { ascending: false }),
      tenantId,
    );

    if (error) {
      return serverError(error.message);
    }

    return NextResponse.json({ history: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(msg);
  }
}
