// app/api/admin/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revokeSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  // サーバー側セッション削除
  const sessionCookie = req.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    revokeSession(sessionCookie).catch((err) =>
      console.error("[Admin Logout] Session revoke error:", err),
    );
  }

  const response = NextResponse.json({ ok: true });

  // Cookieを削除（maxAge=0で即時削除）
  response.cookies.set({
    name: "admin_session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
