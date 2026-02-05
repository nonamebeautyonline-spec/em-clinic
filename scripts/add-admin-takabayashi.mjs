import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

const APP_BASE_URL = envVars.APP_BASE_URL || "https://app.noname-beauty.jp";

async function addAdmin() {
  const email = "tiger.pattern.ko.san@gmail.com";
  const name = "髙林";

  // 既存チェック
  const { data: existing } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    console.log("このメールアドレスは既に登録されています");
    return;
  }

  // 仮パスワード
  const tempPasswordHash = randomBytes(32).toString("hex");

  // ユーザー作成
  const { data: newUser, error: insertError } = await supabase
    .from("admin_users")
    .insert({
      email,
      name,
      password_hash: tempPasswordHash,
      is_active: true,
    })
    .select("id, email, name")
    .single();

  if (insertError) {
    console.error("作成エラー:", insertError);
    return;
  }

  console.log("ユーザー作成完了:", newUser);

  // セットアップトークン作成
  const setupToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const { error: tokenError } = await supabase
    .from("password_reset_tokens")
    .insert({
      admin_user_id: newUser.id,
      token: setupToken,
      expires_at: expiresAt.toISOString(),
    });

  if (tokenError) {
    console.error("トークンエラー:", tokenError);
  }

  const setupUrl = `${APP_BASE_URL}/admin/setup?token=${setupToken}`;
  console.log("\n========================================");
  console.log("管理者追加完了");
  console.log("名前:", name);
  console.log("メール:", email);
  console.log("\nセットアップURL（24時間有効）:");
  console.log(setupUrl);
  console.log("========================================\n");
}

addAdmin();
