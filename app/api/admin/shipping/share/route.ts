import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { customAlphabet } from "nanoid";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { shippingShareSchema } from "@/lib/validations/shipping";
import { logAudit } from "@/lib/audit";

// 短いID生成（英数字のみ、8文字）
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 8);

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);

    const parsed = await parseBody(req, shippingShareSchema);
    if ("error" in parsed) return parsed.error;
    const { data } = parsed.data;

    // 短いIDを生成
    const shareId = nanoid();

    // 3日後に期限切れ
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    // データを保存
    const { error } = await supabaseAdmin.from("shipping_shares").insert({
      ...tenantPayload(tenantId),
      id: shareId,
      data: data,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error("[Share] Insert error:", error);
      return serverError("保存に失敗しました");
    }

    console.log(`[Share] Created share: ${shareId}, expires: ${expiresAt.toISOString()}`);

    logAudit(req, "shipping.share", "shipping", "unknown");
    return NextResponse.json({ shareId });
  } catch (e) {
    console.error("[Share] Error:", e);
    return serverError(e instanceof Error ? e.message : "サーバーエラー");
  }
}
