// カルテメモ編集API（カルテ検索画面から直接編集）
import { NextRequest, NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { karteEditSchema } from "@/lib/validations/admin-operations";

export const dynamic = "force-dynamic";

// カルテメモ更新
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized)
      return unauthorized();

    const parsed = await parseBody(req, karteEditSchema);
    if ("error" in parsed) return parsed.error;
    const { intakeId, note } = parsed.data;

    const tenantId = resolveTenantId(req);

    // ロック確認
    const { data: intake } = await withTenant(
      supabaseAdmin
        .from("intake")
        .select("id, locked_at")
        .eq("id", intakeId),
      tenantId
    ).single();

    if (!intake) {
      return notFound("カルテが見つかりません");
    }

    if (intake.locked_at) {
      return forbidden("このカルテはロックされています。管理者にロック解除を依頼してください。");
    }

    // 更新
    const { error: updateErr } = await withTenant(
      supabaseAdmin
        .from("intake")
        .update({
          note: note || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId),
      tenantId
    );

    if (updateErr) {
      return serverError(updateErr.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(msg);
  }
}
