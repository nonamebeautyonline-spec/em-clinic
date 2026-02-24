// lib/password-policy.ts — パスワード履歴・有効期限チェック
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

// パスワード有効期限: 90日
const PASSWORD_EXPIRY_DAYS = 90;
// 履歴保持件数
const PASSWORD_HISTORY_LIMIT = 5;

/**
 * パスワード履歴チェック
 * 直近5件のハッシュと比較し、再利用されていたら false を返す
 */
export async function checkPasswordHistory(
  userId: string,
  newPassword: string,
): Promise<boolean> {
  const { data: history } = await supabaseAdmin
    .from("password_history")
    .select("password_hash")
    .eq("admin_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(PASSWORD_HISTORY_LIMIT);

  if (!history || history.length === 0) return true;

  for (const entry of history) {
    const isMatch = await bcrypt.compare(newPassword, entry.password_hash);
    if (isMatch) return false;
  }

  return true;
}

/**
 * パスワード有効期限チェック
 * password_changed_at が null の場合は false（既存ユーザー救済）
 * 90日超過で true を返す
 */
export function isPasswordExpired(
  passwordChangedAt: string | null,
): boolean {
  if (!passwordChangedAt) return false;

  const changedAt = new Date(passwordChangedAt);
  const now = new Date();
  const diffMs = now.getTime() - changedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays > PASSWORD_EXPIRY_DAYS;
}

/**
 * パスワード履歴に保存
 * INSERT後、6件目以降の古いレコードを削除
 */
export async function savePasswordHistory(
  userId: string,
  passwordHash: string,
): Promise<void> {
  // 新しい履歴を追加
  await supabaseAdmin.from("password_history").insert({
    admin_user_id: userId,
    password_hash: passwordHash,
  });

  // 古い履歴を削除（6件目以降）
  const { data: oldEntries } = await supabaseAdmin
    .from("password_history")
    .select("id")
    .eq("admin_user_id", userId)
    .order("created_at", { ascending: false })
    .range(PASSWORD_HISTORY_LIMIT, PASSWORD_HISTORY_LIMIT + 100);

  if (oldEntries && oldEntries.length > 0) {
    const idsToDelete = oldEntries.map((e) => e.id);
    await supabaseAdmin
      .from("password_history")
      .delete()
      .in("id", idsToDelete);
  }
}
