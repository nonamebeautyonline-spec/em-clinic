// scripts/backfill-admin-username.cjs
// 既存の admin_users に username (LP-XXXXX) をバックフィルする
// 使い方: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-admin-username.cjs

const { createClient } = require("@supabase/supabase-js");
const { randomInt } = require("crypto");

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PREFIX = "LP";
const ID_LENGTH = 5;
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomId() {
  let result = "";
  for (let i = 0; i < ID_LENGTH; i++) {
    result += CHARSET[randomInt(CHARSET.length)];
  }
  return `${PREFIX}-${result}`;
}

async function main() {
  // username が null のユーザーを取得
  const { data: users, error } = await sb
    .from("admin_users")
    .select("id, email, name, username")
    .is("username", null);

  if (error) {
    console.error("取得エラー:", error);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log("バックフィル対象なし（全ユーザーに username 設定済み）");
    return;
  }

  console.log(`${users.length} 件のユーザーに username をバックフィルします`);

  const usedUsernames = new Set();

  for (const user of users) {
    let username;
    let attempts = 0;
    do {
      username = randomId();
      attempts++;
    } while (usedUsernames.has(username) && attempts < 100);

    usedUsernames.add(username);

    const { error: updateErr } = await sb
      .from("admin_users")
      .update({ username })
      .eq("id", user.id);

    if (updateErr) {
      console.error(`エラー [${user.email}]:`, updateErr);
    } else {
      console.log(`${user.name} (${user.email}) → ${username}`);
    }
  }

  console.log("バックフィル完了");
}

main().catch(console.error);
