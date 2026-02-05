// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

// セッション有効期限: 24時間
const SESSION_DURATION_SECONDS = 24 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, token } = body;

    // 必須チェック
    if (!email || !password || !token) {
      return NextResponse.json(
        { ok: false, error: "メール、パスワード、トークンすべて必要です" },
        { status: 400 }
      );
    }

    // ADMIN_TOKENチェック
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // ユーザー取得
    const { data: user, error: userError } = await supabase
      .from("admin_users")
      .select("id, email, name, password_hash, is_active")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // アクティブチェック
    if (!user.is_active) {
      return NextResponse.json(
        { ok: false, error: "このアカウントは無効化されています" },
        { status: 401 }
      );
    }

    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { ok: false, error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // JWTトークン生成
    const secret = new TextEncoder().encode(JWT_SECRET);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

    const jwt = await new SignJWT({
      role: "admin",
      userId: user.id,
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(secret);

    // レスポンス
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    // httpOnly Cookie設定（24時間有効）
    response.cookies.set({
      name: "admin_session",
      value: jwt,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (err) {
    console.error("[Admin Login] Error:", err);
    return NextResponse.json(
      { ok: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
