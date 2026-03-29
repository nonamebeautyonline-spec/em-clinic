// app/api/platform/totp/status/route.ts — 2FA有効状態をDBから取得
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyPlatformAdmin(req);
    if (!admin) {
      return unauthorized();
    }

    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("totp_enabled")
      .eq("id", admin.userId)
      .single();

    if (error) {
      console.error("[TOTP Status] DB error:", error);
      return serverError("ステータスの取得に失敗しました");
    }

    return NextResponse.json({
      ok: true,
      totpEnabled: data?.totp_enabled ?? false,
    });
  } catch (err) {
    console.error("[TOTP Status] Error:", err);
    return serverError("サーバーエラー");
  }
}
