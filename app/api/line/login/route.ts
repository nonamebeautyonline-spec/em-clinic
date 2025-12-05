// app/api/line/login/route.ts
import { NextRequest, NextResponse } from "next/server";

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";

export async function GET(req: NextRequest) {
  console.log("DEBUG LINE_CHANNEL_ID:", process.env.LINE_CHANNEL_ID);
  console.log("DEBUG LINE_REDIRECT_URI:", process.env.LINE_REDIRECT_URI);

  if (!process.env.LINE_CHANNEL_ID || !process.env.LINE_REDIRECT_URI) {
    return NextResponse.json(
      {
        ok: false,
        error: "LINE env missing",
        id: process.env.LINE_CHANNEL_ID,
        redirect: process.env.LINE_REDIRECT_URI,
      },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

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
