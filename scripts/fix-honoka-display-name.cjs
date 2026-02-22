// ほのかの line_display_name を修正（「りさこ」→ LINE APIから取得）
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((l) => {
  const t = l.trim();
  if (!t || t.startsWith("#")) return;
  const i = t.indexOf("=");
  if (i === -1) return;
  let v = t.substring(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.substring(0, i).trim()] = v;
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const TOKEN = env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN;
const HONOKA_LINE_UID = "U03dabc044e7b04d2a695b3c33b119cfd";

async function main() {
  // LINE APIからプロフィール取得
  const res = await fetch(`https://api.line.me/v2/bot/profile/${HONOKA_LINE_UID}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  if (!res.ok) {
    console.error("LINE API error:", res.status, await res.text());
    return;
  }

  const profile = await res.json();
  console.log("LINE プロフィール:", JSON.stringify(profile, null, 2));

  // intake の line_display_name を更新
  const { error } = await sb.from("intake")
    .update({
      line_display_name: profile.displayName || null,
      line_picture_url: profile.pictureUrl || null,
    })
    .eq("id", 33755);

  if (error) {
    console.error("更新エラー:", error.message);
  } else {
    console.log(`intake 33755 の line_display_name を「${profile.displayName}」に更新しました`);
  }
}

main().catch(console.error);
