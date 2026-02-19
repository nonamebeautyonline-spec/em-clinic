// lib/username.ts — ユーザーID（LP-XXXXX）自動生成
import { randomInt } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

const PREFIX = "LP";
const ID_LENGTH = 5;
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい文字（0,O,1,I）除外

/**
 * ランダムなユーザーID文字列を生成（例: LP-A3K7N）
 */
function randomId(): string {
  let result = "";
  for (let i = 0; i < ID_LENGTH; i++) {
    result += CHARSET[randomInt(CHARSET.length)];
  }
  return `${PREFIX}-${result}`;
}

/**
 * ユニークなユーザーIDを生成（DB重複チェック付き）
 * 最大5回リトライ
 */
export async function generateUsername(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const username = randomId();
    const { data } = await supabaseAdmin
      .from("admin_users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (!data) return username;
  }
  // 5回リトライしても衝突する場合（極めて稀）
  throw new Error("ユーザーID生成に失敗しました。再度お試しください。");
}
