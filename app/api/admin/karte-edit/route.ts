// カルテメモ編集API（カルテ検索画面から直接編集）+ 編集履歴記録
import { NextRequest, NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth, getAdminUserId } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { karteEditSchema } from "@/lib/validations/admin-operations";
import { recordKarteChange } from "@/lib/karte-history";

export const dynamic = "force-dynamic";

// カルテメモ更新
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized)
      return unauthorized();

    const parsed = await parseBody(req, karteEditSchema);
    if ("error" in parsed) return parsed.error;
    const { intakeId, note, changeReason } = parsed.data;

    const tenantId = resolveTenantId(req);
    const adminUserId = await getAdminUserId(req);

    // 現在のカルテを取得（履歴記録 + ロック確認 + 確定チェック）
    const { data: intake } = await withTenant(
      supabaseAdmin
        .from("intake")
        .select("id, note, locked_at, karte_status")
        .eq("id", intakeId),
      tenantId
    ).single();

    if (!intake) {
      return notFound("カルテが見つかりません");
    }

    if (intake.locked_at) {
      return forbidden("このカルテはロックされています。管理者にロック解除を依頼してください。");
    }

    // 確定済みカルテの編集には理由が必須
    const currentStatus = intake.karte_status ?? "draft";
    if (currentStatus === "confirmed" && !changeReason) {
      return NextResponse.json(
        { error: "確定済みカルテの編集には変更理由が必要です" },
        { status: 400 },
      );
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

    // 編集履歴を記録（監査要件）
    await recordKarteChange({
      intakeId,
      noteBefore: intake.note ?? null,
      noteAfter: note || null,
      karteStatusBefore: currentStatus,
      karteStatusAfter: currentStatus,
      changeReason: changeReason || null,
      changedBy: adminUserId || "unknown",
      changedById: adminUserId,
      tenantId,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(msg);
  }
}
