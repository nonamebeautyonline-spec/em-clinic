// app/api/line/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state") || "";

  // stateからreturnUrlを復元
  let returnUrl = "";
  try {
    const stateJson = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    returnUrl = stateJson.returnUrl || "";
  } catch {
    // 旧形式のstate（UUID文字列）の場合は無視
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.APP_BASE_URL}/login-error`);
  }

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

  const payload = JSON.parse(
    Buffer.from(idToken.split(".")[1], "base64").toString()
  );
  const lineUserId = payload.sub as string;

  // ★ LINE UIDでDB照合 → 既知の患者ならSMS認証スキップ
  let patientId: string | null = null;

  const { data } = await supabase
    .from("intake")
    .select("patient_id")
    .eq("line_id", lineUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.patient_id) {
    patientId = data.patient_id;
    console.log(`[LINE callback] Known patient: ${patientId} (LINE UID match)`);
  }

  // returnUrlが指定されている場合はそちらへリダイレクト
  // 既知の患者 → /mypage へ直接（SMS不要）
  // 未知 → /mypage/init へ（SMS認証で初回紐付け）
  let redirectUrl: string;
  if (returnUrl && returnUrl.startsWith("/")) {
    redirectUrl = `${process.env.APP_BASE_URL}${returnUrl}`;
  } else {
    redirectUrl = patientId
      ? `${process.env.APP_BASE_URL}/mypage`
      : `${process.env.APP_BASE_URL}/mypage/init`;
  }

  const res = NextResponse.redirect(redirectUrl);

  // line_user_id cookie セット（30日）
  res.cookies.set("line_user_id", lineUserId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  // 既知の患者なら patient_id cookie もセット
  if (patientId) {
    res.cookies.set("__Host-patient_id", patientId, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    res.cookies.set("patient_id", patientId, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return res;
}
