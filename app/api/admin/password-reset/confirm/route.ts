// app/api/admin/password-reset/confirm/route.ts
// パスワード設定/リセット確認
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// トークン検証（GET）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "トークンが必要です" },
      { status: 400 }
    );
  }

  // トークン検証
  const { data: resetToken, error } = await supabase
    .from("password_reset_tokens")
    .select(`
      id,
      expires_at,
      used_at,
      admin_user_id,
      admin_users (
        id,
        email,
        name
      )
    `)
    .eq("token", token)
    .single();

  if (error || !resetToken) {
    return NextResponse.json(
      { ok: false, error: "無効なトークンです" },
      { status: 400 }
    );
  }

  // 使用済みチェック
  if (resetToken.used_at) {
    return NextResponse.json(
      { ok: false, error: "このリンクは既に使用されています" },
      { status: 400 }
    );
  }

  // 有効期限チェック
  if (new Date(resetToken.expires_at) < new Date()) {
    return NextResponse.json(
      { ok: false, error: "このリンクは有効期限切れです" },
      { status: 400 }
    );
  }

  const user = resetToken.admin_users as any;

  return NextResponse.json({
    ok: true,
    user: {
      email: user.email,
      name: user.name,
    },
  });
}

// パスワード設定（POST）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { ok: false, error: "トークンとパスワードが必要です" },
        { status: 400 }
      );
    }

    // パスワード強度チェック
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "パスワードは8文字以上必要です" },
        { status: 400 }
      );
    }

    // トークン検証
    const { data: resetToken, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("id, admin_user_id, expires_at, used_at")
      .eq("token", token)
      .single();

    if (tokenError || !resetToken) {
      return NextResponse.json(
        { ok: false, error: "無効なトークンです" },
        { status: 400 }
      );
    }

    if (resetToken.used_at) {
      return NextResponse.json(
        { ok: false, error: "このリンクは既に使用されています" },
        { status: 400 }
      );
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json(
        { ok: false, error: "このリンクは有効期限切れです" },
        { status: 400 }
      );
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, 12);

    // パスワード更新
    const { error: updateError } = await supabase
      .from("admin_users")
      .update({ password_hash: passwordHash })
      .eq("id", resetToken.admin_user_id);

    if (updateError) {
      console.error("[Password Reset] Update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "パスワードの更新に失敗しました" },
        { status: 500 }
      );
    }

    // トークンを使用済みにする
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", resetToken.id);

    return NextResponse.json({
      ok: true,
      message: "パスワードを設定しました",
    });
  } catch (err) {
    console.error("[Password Reset Confirm] Error:", err);
    return NextResponse.json(
      { ok: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
