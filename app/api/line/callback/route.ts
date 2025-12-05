// app/api/line/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(`${process.env.APP_BASE_URL}/login-error`);
  }

  // トークン交換
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.LINE_REDIRECT_URI!,
    client_id: process.env.LINE_CHANNEL_ID!,
    client_secret: process.env.LINE_CHANNEL_SECRET!,
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) {
    console.error("LINE token error", await tokenRes.text());
    return NextResponse.redirect(`${process.env.APP_BASE_URL}/login-error`);
  }

  const tokenJson = await tokenRes.json();
  const idToken = tokenJson.id_token as string;

  // IDトークンをデコード（簡易版：本気なら署名検証もやる）
  const payload = JSON.parse(
    Buffer.from(idToken.split(".")[1], "base64").toString()
  );
  const lineUserId = payload.sub as string;

  // ここで lineUserId をセッションcookieに保存する（超シンプル版）
  const res = NextResponse.redirect(`${process.env.APP_BASE_URL}/mypage/init`);
  res.cookies.set("line_user_id", lineUserId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
  });

  return res;
}
