// app/api/admin/google-calendar/callback/route.ts
// Google Calendar OAuth2 コールバックAPI
// Googleの認証画面から戻ってきた際に呼び出される
// codeを受け取り、トークン交換してdoctorsテーブルに保存

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  exchangeCode,
  decodeState,
  calculateTokenExpiry,
} from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  try {
    // Googleからのコールバックパラメータ取得
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const error = req.nextUrl.searchParams.get("error");

    // ユーザーが認証を拒否した場合
    if (error) {
      console.error("[Google Calendar Callback] 認証拒否:", error);
      const redirectUrl = new URL("/admin/reservations", req.nextUrl.origin);
      redirectUrl.searchParams.set("gcal_error", "auth_denied");
      return NextResponse.redirect(redirectUrl);
    }

    if (!code || !state) {
      const redirectUrl = new URL("/admin/reservations", req.nextUrl.origin);
      redirectUrl.searchParams.set("gcal_error", "missing_params");
      return NextResponse.redirect(redirectUrl);
    }

    // stateからテナントIDと医師IDをデコード
    let tenantId: string;
    let doctorId: string;
    try {
      const decoded = decodeState(state);
      tenantId = decoded.tenantId;
      doctorId = decoded.doctorId;
    } catch {
      const redirectUrl = new URL("/admin/reservations", req.nextUrl.origin);
      redirectUrl.searchParams.set("gcal_error", "invalid_state");
      return NextResponse.redirect(redirectUrl);
    }

    // 認証コードをトークンに交換
    const tokenResponse = await exchangeCode(code);

    // doctorsテーブルにトークン情報を保存
    const expiresAt = calculateTokenExpiry(tokenResponse.expires_in);

    const { error: updateError } = await supabaseAdmin
      .from("doctors")
      .update({
        google_calendar_id: "primary", // デフォルトはプライマリカレンダー
        google_access_token: tokenResponse.access_token,
        google_refresh_token: tokenResponse.refresh_token || null,
        google_token_expires_at: expiresAt,
      })
      .eq("doctor_id", doctorId)
      .eq("tenant_id", tenantId);

    if (updateError) {
      console.error("[Google Calendar Callback] DB更新エラー:", updateError);
      const redirectUrl = new URL("/admin/reservations", req.nextUrl.origin);
      redirectUrl.searchParams.set("gcal_error", "db_error");
      return NextResponse.redirect(redirectUrl);
    }

    console.log(`[Google Calendar Callback] 連携成功: doctor_id=${doctorId}, tenant_id=${tenantId}`);

    // 成功時は管理画面にリダイレクト
    const redirectUrl = new URL("/admin/reservations", req.nextUrl.origin);
    redirectUrl.searchParams.set("gcal_success", "true");
    redirectUrl.searchParams.set("doctor_id", doctorId);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[Google Calendar Callback] エラー:", error);
    const redirectUrl = new URL("/admin/reservations", req.nextUrl.origin);
    redirectUrl.searchParams.set("gcal_error", "server_error");
    return NextResponse.redirect(redirectUrl);
  }
}
