// app/api/line/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

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

  const tenantId = resolveTenantId(req);
  const tid = tenantId ?? undefined;

  const appBaseUrl = (await getSettingOrEnv("general", "app_base_url", "APP_BASE_URL", tid)) || "";
  const channelId = (await getSettingOrEnv("line", "channel_id", "LINE_CHANNEL_ID", tid)) || "";
  const channelSecret = (await getSettingOrEnv("line", "channel_secret", "LINE_CHANNEL_SECRET", tid)) || "";
  const redirectUri = (await getSettingOrEnv("line", "redirect_uri", "LINE_REDIRECT_URI", tid)) || "";

  if (!code) {
    return NextResponse.redirect(`${appBaseUrl}/login-error`);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: channelId,
    client_secret: channelSecret,
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) {
    console.error("LINE token error", await tokenRes.text());
    return NextResponse.redirect(`${appBaseUrl}/login-error`);
  }

  const tokenJson = await tokenRes.json();
  const idToken = tokenJson.id_token as string;

  const payload = JSON.parse(
    Buffer.from(idToken.split(".")[1], "base64").toString()
  );
  const lineUserId = payload.sub as string;

  // ★ LINE UIDでDB照合 → 既知の患者ならSMS認証スキップ
  // patients テーブルの line_id で検索（intake に line_id カラムは存在しない）
  let patientId: string | null = null;

  const { data } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("patient_id, tel")
      .eq("line_id", lineUserId)
      .not("patient_id", "like", "LINE_%"),
    tenantId
  ).limit(1).maybeSingle();

  if (data?.patient_id) {
    patientId = data.patient_id;
    console.log(`[LINE callback] Known patient: ${patientId} (LINE UID match, tel=${data.tel ? "set" : "null"})`);
  }

  // returnUrlが指定されている場合はそちらへリダイレクト
  // 既知の患者（名前+電話番号あり）→ /mypage へ直接
  // 既知だが電話番号未登録 → /mypage（サーバーコンポーネントが /mypage/init にリダイレクト）
  // 未知 → /register へ（個人情報フォーム）
  let redirectUrl: string;
  if (returnUrl && returnUrl.startsWith("/")) {
    redirectUrl = `${appBaseUrl}${returnUrl}`;
  } else {
    redirectUrl = patientId
      ? `${appBaseUrl}/mypage`
      : `${appBaseUrl}/register`;
  }

  // 302リダイレクト + Set-Cookie だとLINEアプリ内ブラウザでcookieが保存されないケースがある
  // → 200 HTML を返し、ブラウザが確実にSet-Cookieを処理してからJSリダイレクト
  const safeRedirectUrl = redirectUrl.replace(/[<>"'&]/g, "");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${safeRedirectUrl}"><title>リダイレクト中</title></head><body><p>リダイレクト中...</p><script>window.location.href="${safeRedirectUrl}";</script></body></html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  // line_user_id cookie セット（30日）
  res.cookies.set("line_user_id", lineUserId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  // patient_id cookie を常に更新（アカウント切替時に古い cookie が残る問題を防止）
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
  } else {
    // 未知の患者 → 古い patient_id cookie をクリア（他人のデータ表示防止）
    res.cookies.set("__Host-patient_id", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 0,
    });
    res.cookies.set("patient_id", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 0,
    });
  }

  return res;
}
