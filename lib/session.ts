// lib/session.ts — サーバー側セッション管理
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// 同時セッション上限
const MAX_SESSIONS_PER_USER = 3;

/**
 * JWTトークンのハッシュを生成（DBにはJWT本体を保存しない）
 */
export function hashToken(jwt: string): string {
  return createHash("sha256").update(jwt).digest("hex");
}

/**
 * セッション作成（ログイン時）
 * 同一ユーザーのセッションが上限を超えたら最古を削除
 */
export async function createSession(params: {
  adminUserId: string;
  tenantId: string | null;
  jwt: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<void> {
  const tokenHash = hashToken(params.jwt);

  // セッション作成
  await supabase.from("admin_sessions").insert({
    admin_user_id: params.adminUserId,
    tenant_id: params.tenantId,
    token_hash: tokenHash,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    expires_at: params.expiresAt.toISOString(),
  });

  // 上限超過の古いセッションを削除
  const { data: sessions } = await supabase
    .from("admin_sessions")
    .select("id, created_at")
    .eq("admin_user_id", params.adminUserId)
    .order("created_at", { ascending: false });

  if (sessions && sessions.length > MAX_SESSIONS_PER_USER) {
    const toDelete = sessions.slice(MAX_SESSIONS_PER_USER).map((s) => s.id);
    await supabase.from("admin_sessions").delete().in("id", toDelete);
  }
}

/**
 * セッション存在チェック（認証時）
 * 存在すれば last_activity を更新（5分以上経過時のみ）
 */
export async function validateSession(jwt: string): Promise<boolean> {
  const tokenHash = hashToken(jwt);

  const { data: session } = await supabase
    .from("admin_sessions")
    .select("id, last_activity, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!session) return false;

  // 有効期限チェック
  if (new Date(session.expires_at) < new Date()) {
    // 期限切れセッションを削除
    await supabase.from("admin_sessions").delete().eq("id", session.id);
    return false;
  }

  // last_activity 更新（5分以上経過時のみ、DB負荷軽減）
  const lastActivity = new Date(session.last_activity);
  if (Date.now() - lastActivity.getTime() > 5 * 60 * 1000) {
    await supabase
      .from("admin_sessions")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", session.id);
  }

  return true;
}

/**
 * セッション削除（ログアウト時）
 */
export async function revokeSession(jwt: string): Promise<void> {
  const tokenHash = hashToken(jwt);
  await supabase.from("admin_sessions").delete().eq("token_hash", tokenHash);
}

/**
 * ユーザーの全セッション削除（強制ログアウト）
 */
export async function revokeAllSessions(adminUserId: string): Promise<void> {
  await supabase.from("admin_sessions").delete().eq("admin_user_id", adminUserId);
}

/**
 * 期限切れセッションの一括削除（Cronで定期実行推奨）
 */
export async function cleanExpiredSessions(): Promise<number> {
  const { data } = await supabase
    .from("admin_sessions")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");
  return data?.length ?? 0;
}
