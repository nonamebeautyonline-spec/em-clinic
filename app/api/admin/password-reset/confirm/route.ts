// app/api/admin/password-reset/confirm/route.ts
// パスワード設定/リセット確認
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api-error";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { adminPasswordResetConfirmSchema } from "@/lib/validations/admin-operations";
import { checkPasswordHistory, savePasswordHistory } from "@/lib/password-policy";
import { logAudit } from "@/lib/audit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// トークン検証（GET）
export async function GET(req: NextRequest) {
  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return badRequest("トークンが必要です");
  }

  // トークン検証
  const { data: resetToken, error } = await strictWithTenant(
    supabase
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
      .single(),
    tenantId
  );

  if (error || !resetToken) {
    return badRequest("無効なトークンです");
  }

  // 使用済みチェック
  if (resetToken.used_at) {
    return badRequest("このリンクは既に使用されています");
  }

  // 有効期限チェック
  if (new Date(resetToken.expires_at) < new Date()) {
    return badRequest("このリンクは有効期限切れです");
  }

  const user = resetToken.admin_users as unknown as { email: string; name: string } | null;

  return NextResponse.json({
    ok: true,
    user: {
      email: user?.email ?? "",
      name: user?.name ?? "",
    },
  });
}

// パスワード設定（POST）
export async function POST(req: NextRequest) {
  try {
    const parsed = await parseBody(req, adminPasswordResetConfirmSchema);
    if ("error" in parsed) return parsed.error;
    const { token, password } = parsed.data;

    const tenantId = resolveTenantIdOrThrow(req);

    // トークン検証
    const { data: resetToken, error: tokenError } = await strictWithTenant(
      supabase
        .from("password_reset_tokens")
        .select("id, admin_user_id, expires_at, used_at")
        .eq("token", token)
        .single(),
      tenantId
    );

    if (tokenError || !resetToken) {
      return badRequest("無効なトークンです");
    }

    if (resetToken.used_at) {
      return badRequest("このリンクは既に使用されています");
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      return badRequest("このリンクは有効期限切れです");
    }

    // パスワード履歴チェック（直近5回と重複していないか）
    const isAllowed = await checkPasswordHistory(resetToken.admin_user_id, password);
    if (!isAllowed) {
      return badRequest("過去5回以内に使用したパスワードは再利用できません");
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, 12);

    // パスワード更新 + password_changed_at 更新
    const { error: updateError } = await strictWithTenant(
      supabase
        .from("admin_users")
        .update({
          password_hash: passwordHash,
          password_changed_at: new Date().toISOString(),
        })
        .eq("id", resetToken.admin_user_id),
      tenantId
    );

    if (updateError) {
      console.error("[Password Reset] Update error:", updateError);
      return serverError("パスワードの更新に失敗しました");
    }

    // パスワード履歴に保存
    await savePasswordHistory(resetToken.admin_user_id, passwordHash);

    // トークンを使用済みにする
    await strictWithTenant(
      supabase
        .from("password_reset_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", resetToken.id),
      tenantId
    );

    logAudit(req, "password_reset.confirm", "admin_user", String(resetToken.id));
    return NextResponse.json({
      ok: true,
      message: "パスワードを設定しました",
    });
  } catch (err) {
    console.error("[Password Reset Confirm] Error:", err);
    return serverError("サーバーエラー");
  }
}
