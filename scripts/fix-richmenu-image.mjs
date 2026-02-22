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

// 1. DB から画像URLを取得
const { data: menu } = await supabase
  .from("rich_menus")
  .select("image_url")
  .eq("id", 1)
  .single();

console.log("画像URL:", menu.image_url);

// 2. 画像をダウンロード
const imgRes = await fetch(menu.image_url);
if (!imgRes.ok) {
  console.error("画像ダウンロード失敗:", imgRes.status);
  process.exit(1);
}
const contentType = imgRes.headers.get("content-type") || "image/png";
const buffer = await imgRes.arrayBuffer();
console.log("画像サイズ:", buffer.byteLength, "bytes, type:", contentType);

// 3. LINE APIに画像アップロード
const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${newMenuId}/content`, {
  method: "POST",
  headers: {
    "Content-Type": contentType,
    Authorization: `Bearer ${lineToken}`,
  },
  body: buffer,
});
const uploadText = await uploadRes.text();
console.log("画像アップロード:", uploadRes.status, uploadRes.ok ? "✓ 成功" : "✗ 失敗", uploadText);

if (!uploadRes.ok) process.exit(1);

// 4. 処方後メニュー対象ユーザー(orders有り)を新メニューにリリンク
const lineIds = [];
let from = 0;
while (true) {
  const { data } = await supabase.from("orders").select("patient_id").range(from, from + 999);
  if (!data || data.length === 0) break;
  const pids = Array.from(new Set(data.map(d => d.patient_id)));
  const { data: intakes } = await supabase
    .from("intake")
    .select("line_id")
    .in("patient_id", pids)
    .not("line_id", "is", null);
  if (intakes) lineIds.push(...intakes.map(i => i.line_id).filter(Boolean));
  if (data.length < 1000) break;
  from += 1000;
}
const uniqueIds = Array.from(new Set(lineIds));
console.log(`\n対象ユーザー: ${uniqueIds.length}人`);

let linked = 0, failed = 0;
for (let i = 0; i < uniqueIds.length; i += 500) {
  const batch = uniqueIds.slice(i, i + 500);
  const res = await fetch("https://api.line.me/v2/bot/richmenu/bulk/link", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lineToken}`,
    },
    body: JSON.stringify({ richMenuId: newMenuId, userIds: batch }),
  });
  if (res.ok) {
    linked += batch.length;
  } else {
    const errText = await res.text();
    console.log("バルクリンクエラー:", res.status, errText);
    // 個別フォールバック
    for (const uid of batch) {
      const r = await fetch(`https://api.line.me/v2/bot/user/${uid}/richmenu/${newMenuId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${lineToken}` },
      });
      if (r.ok) linked++;
      else failed++;
    }
  }
  if ((i + 500) % 1000 === 0 || i + 500 >= uniqueIds.length) {
    console.log(`  進捗: ${Math.min(i + 500, uniqueIds.length)}/${uniqueIds.length}`);
  }
}

console.log(`\n結果: リリンク ${linked}人成功, ${failed}人失敗`);
