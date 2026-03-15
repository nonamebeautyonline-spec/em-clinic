// app/api/line/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { executeActionSteps } from "@/lib/lifecycle-actions";

const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state") || "";

  // stateからreturnUrl・テナントIDを復元
  let returnUrl = "";
  let stateTenantId: string | null = null;
  try {
    const stateJson = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    returnUrl = stateJson.returnUrl || "";
    stateTenantId = stateJson.tenantId || null;
  } catch {
    // 旧形式のstate（UUID文字列）の場合は無視
  }

  // middleware解決を優先、fallbackとしてstateのtenantIdを使用
  const tenantId = resolveTenantId(req) || stateTenantId;
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

  // ★ 流入経路トラッキング紐付け
  // 中間ページ /s/[code] で設定されたCookieを読み取り、訪問記録とLINE UIDを紐付ける
  const trackingVisitId = req.cookies.get("tracking_visit_id")?.value;
  if (trackingVisitId) {
    try {
      // tracking_visits に line_uid を設定
      const { data: visit } = await supabaseAdmin
        .from("tracking_visits")
        .update({ line_uid: lineUserId, converted_at: new Date().toISOString() })
        .eq("id", Number(trackingVisitId))
        .is("line_uid", null)
        .select("source_id, utm_source, utm_medium, utm_campaign")
        .maybeSingle();

      // 患者が既知の場合は patients にも紐付け
      if (visit && patientId) {
        await withTenant(
          supabaseAdmin
            .from("patients")
            .update({
              tracking_source_id: visit.source_id,
              tracking_visit_id: Number(trackingVisitId),
              utm_source: visit.utm_source || null,
              utm_medium: visit.utm_medium || null,
              utm_campaign: visit.utm_campaign || null,
            })
            .eq("patient_id", patientId),
          tenantId
        );
      }
      // 未知の患者の場合は tracking_visits に line_uid だけ設定済み
      // → register/personal-info で patient_id 紐付けを行う

      // 流入経路のアクション実行（患者が既知でLINE UIDがある場合）
      if (visit && patientId) {
        const { data: source } = await supabaseAdmin
          .from("tracking_sources")
          .select("action_settings, action_execution")
          .eq("id", visit.source_id)
          .maybeSingle();

        const actionSettings = source?.action_settings as { enabled?: boolean; steps?: unknown[] } | null;
        if (actionSettings?.enabled && actionSettings.steps && actionSettings.steps.length > 0) {
          // action_execution === "first_only" の場合、過去のvisitがあればスキップ
          let shouldExecute = true;
          if (source?.action_execution === "first_only") {
            const { count } = await supabaseAdmin
              .from("tracking_visits")
              .select("id", { count: "exact", head: true })
              .eq("source_id", visit.source_id)
              .eq("line_uid", lineUserId)
              .neq("id", Number(trackingVisitId));
            if (count && count > 0) shouldExecute = false;
          }

          if (shouldExecute) {
            // 患者名を取得
            const { data: pat } = await withTenant(
              supabaseAdmin.from("patients").select("name").eq("patient_id", patientId).maybeSingle(),
              tenantId
            );
            const { actionDetails } = await executeActionSteps({
              steps: actionSettings.steps as Parameters<typeof executeActionSteps>[0]["steps"],
              patientId,
              lineUserId,
              patientName: pat?.name || "",
              tenantId,
              assignedBy: "tracking_source",
            });
            if (actionDetails.length > 0) {
              console.log("[LINE callback] 流入経路アクション実行:", actionDetails.join(", "));
            }
          }
        }
      }
    } catch (e) {
      console.error("[LINE callback] 流入経路紐付けエラー:", e);
    }
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
