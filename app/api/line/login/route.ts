// app/api/line/login/route.ts
import { NextRequest, NextResponse } from "next/server";

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";

export async function GET(req: NextRequest) {
  const state = crypto.randomUUID(); // CSRF対策
  const nonce = crypto.randomUUID(); // IDトークン検証用（本気でやるなら保存）

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINE_CHANNEL_ID!,
    redirect_uri: process.env.LINE_REDIRECT_URI!,
    state,
    scope: "openid profile",
    nonce,
  });

  return NextResponse.redirect(`${LINE_AUTH_URL}?${params.toString()}`);
}
