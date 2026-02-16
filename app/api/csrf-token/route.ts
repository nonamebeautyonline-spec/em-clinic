// app/api/csrf-token/route.ts — CSRFトークン発行
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET() {
  const token = randomUUID();

  const response = NextResponse.json({ csrfToken: token });

  // httpOnly=false にしてJSから読み取れるようにする（Double Submit Cookie パターン）
  response.cookies.set({
    name: "csrf_token",
    value: token,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60, // 24時間
  });

  return response;
}
