// app/api/line/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenantId } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const tid = tenantId ?? undefined;

  const channelId = (await getSettingOrEnv("line", "channel_id", "LINE_CHANNEL_ID", tid)) || "";
  const redirectUri = (await getSettingOrEnv("line", "redirect_uri", "LINE_REDIRECT_URI", tid)) || "";

  if (!channelId || !redirectUri) {
    return NextResponse.json(
      {
        ok: false,
        error: "LINE env missing",
        id: channelId || undefined,
        redirect: redirectUri || undefined,
      },
      { status: 500 }
    );
  }

  // returnUrl対応: ログイン後に戻るURLをstateに含める
  const returnUrl = req.nextUrl.searchParams.get("returnUrl") || "";
  const statePayload = JSON.stringify({ csrf: crypto.randomUUID(), returnUrl });
  const state = Buffer.from(statePayload).toString("base64url");
  const nonce = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile",
    nonce,
  });

  return NextResponse.redirect(`${LINE_AUTH_URL}?${params.toString()}`);
}
