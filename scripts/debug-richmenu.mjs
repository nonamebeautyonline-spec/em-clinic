import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);
const lineToken = envVars.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || envVars.LINE_CHANNEL_ACCESS_TOKEN;
const newMenuId = "richmenu-6cab38fd2378af1ff9cc796f4440e399";

// メニューがLINE上に存在するか確認
const menuRes = await fetch("https://api.line.me/v2/bot/richmenu/" + newMenuId, {
  headers: { Authorization: `Bearer ${lineToken}` },
});
console.log("メニュー存在確認:", menuRes.status, menuRes.ok ? "存在" : "存在しない");
if (!menuRes.ok) {
  const text = await menuRes.text();
  console.log("エラー:", text);
}

// 画像がアップロードされているか
const imgRes = await fetch("https://api-data.line.me/v2/bot/richmenu/" + newMenuId + "/content", {
  headers: { Authorization: `Bearer ${lineToken}` },
});
console.log("画像確認:", imgRes.status, imgRes.ok ? "あり" : "なし");

// テスト: 1人だけリンクしてみる
const { data: testUser } = await supabase.from("intake").select("line_id").not("line_id", "is", null).limit(1).single();
if (testUser) {
  const linkRes = await fetch(`https://api.line.me/v2/bot/user/${testUser.line_id}/richmenu/${newMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lineToken}` },
  });
  const linkText = await linkRes.text();
  console.log("テストリンク:", linkRes.status, linkText);
}

// LINE上の全メニュー一覧も再確認
const listRes = await fetch("https://api.line.me/v2/bot/richmenu/list", {
  headers: { Authorization: `Bearer ${lineToken}` },
});
const listData = await listRes.json();
console.log("\nLINE上のメニュー数:", listData.richmenus?.length);
for (const m of (listData.richmenus || [])) {
  console.log(`  ${m.richMenuId} - ${m.name}`);
}
