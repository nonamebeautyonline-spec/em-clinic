// scripts/sync-richmenu-now.mjs
// DB上のリッチメニュー設定をLINE APIに手動同期

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
const LINE_API = "https://api.line.me/v2/bot";
const LINE_DATA_API = "https://api-data.line.me/v2/bot";
const origin = "https://app.noname-beauty.jp";

// 対象メニューID（引数で指定、デフォルトは全件）
const targetId = process.argv[2] ? Number(process.argv[2]) : null;

function mapActionToLine(action) {
  switch (action.type) {
    case "uri":
      return { type: "uri", uri: action.uri || "https://line.me", label: action.label || "リンク" };
    case "tel":
      return { type: "uri", uri: action.tel?.startsWith("tel:") ? action.tel : `tel:${action.tel || ""}`, label: action.label || "電話" };
    case "message":
      return { type: "message", text: action.text || "メッセージ" };
    case "form":
      return { type: "uri", uri: `${origin}/forms/${action.formSlug || ""}`, label: action.label || "フォーム" };
    case "action":
      return { type: "postback", data: JSON.stringify({ type: "rich_menu_action", actions: action.actions || [], userMessage: action.userMessage || "" }), displayText: action.userMessage || undefined };
    default:
      return { type: "postback", data: JSON.stringify({ type: action.type || "noop" }) };
  }
}

async function syncMenu(menu) {
  const tag = `[${menu.name}:${menu.id}]`;
  console.log(`\n${tag} 同期開始`);

  const oldLineMenuId = menu.line_rich_menu_id;
  const sizeHeight = menu.size_type === "half" ? 843 : 1686;

  const areas = (menu.areas || []).map((area) => {
    const b = area.bounds;
    const x = Math.max(0, b.x);
    const y = Math.max(0, b.y);
    return {
      bounds: { x, y, width: b.width - (x - b.x), height: b.height - (y - b.y) },
      action: mapActionToLine(area.action),
    };
  });

  if (areas.length === 0) {
    areas.push({ bounds: { x: 0, y: 0, width: 2500, height: sizeHeight }, action: { type: "message", text: "メニュー" } });
  }

  // Step 1: 新メニュー作成
  console.log(`${tag} Step1: Creating LINE menu`);
  const createRes = await fetch(`${LINE_API}/richmenu`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${lineToken}` },
    body: JSON.stringify({
      size: { width: 2500, height: sizeHeight },
      selected: menu.selected,
      name: menu.name.slice(0, 300),
      chatBarText: (menu.chat_bar_text || "メニュー").slice(0, 14),
      areas,
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    console.error(`${tag} Step1 FAILED:`, createRes.status, text);
    return false;
  }
  const { richMenuId } = await createRes.json();
  console.log(`${tag} Step1 OK: ${richMenuId}`);

  // Step 2: 画像アップロード
  console.log(`${tag} Step2: Uploading image`);
  const imgRes = await fetch(menu.image_url);
  if (!imgRes.ok) {
    console.error(`${tag} Step2 FAILED: Image download ${imgRes.status}`);
    await fetch(`${LINE_API}/richmenu/${richMenuId}`, { method: "DELETE", headers: { Authorization: `Bearer ${lineToken}` } });
    return false;
  }
  const contentType = imgRes.headers.get("content-type") || "image/png";
  const buffer = await imgRes.arrayBuffer();
  console.log(`${tag} Step2: Downloaded ${buffer.byteLength} bytes`);

  const uploadRes = await fetch(`${LINE_DATA_API}/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { "Content-Type": contentType, Authorization: `Bearer ${lineToken}` },
    body: buffer,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    console.error(`${tag} Step2 FAILED: Upload ${uploadRes.status}`, text);
    await fetch(`${LINE_API}/richmenu/${richMenuId}`, { method: "DELETE", headers: { Authorization: `Bearer ${lineToken}` } });
    return false;
  }
  console.log(`${tag} Step2 OK`);

  // Step 3: DB更新
  console.log(`${tag} Step3: Updating DB`);
  const { error: dbErr } = await supabase
    .from("rich_menus")
    .update({ line_rich_menu_id: richMenuId, is_active: true })
    .eq("id", menu.id);
  console.log(`${tag} Step3 ${dbErr ? "FAILED: " + dbErr.message : "OK"}`);

  // Step 4: デフォルト設定
  if (menu.selected) {
    console.log(`${tag} Step4: Setting as default`);
    const defRes = await fetch(`${LINE_API}/user/all/richmenu/${richMenuId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lineToken}` },
    });
    console.log(`${tag} Step4 ${defRes.ok ? "OK" : "FAILED: " + defRes.status}`);
  }

  // Step 5: ユーザーリリンク
  if (menu.name === "処方後" || menu.name === "個人情報入力後") {
    console.log(`${tag} Step5: Re-linking users`);
    const lineIds = [];

    if (menu.name === "処方後") {
      let from = 0;
      while (true) {
        const { data } = await supabase.from("orders").select("patient_id").range(from, from + 999);
        if (!data || data.length === 0) break;
        const pids = Array.from(new Set(data.map(d => d.patient_id)));
        const { data: intakes } = await supabase.from("intake").select("line_id").in("patient_id", pids).not("line_id", "is", null);
        if (intakes) lineIds.push(...intakes.map(i => i.line_id).filter(Boolean));
        if (data.length < 1000) break;
        from += 1000;
      }
    } else {
      let from = 0;
      while (true) {
        const { data: intakes } = await supabase.from("intake").select("patient_id, line_id").not("line_id", "is", null).range(from, from + 999);
        if (!intakes || intakes.length === 0) break;
        const pids = intakes.map(i => i.patient_id);
        const { data: orders } = await supabase.from("orders").select("patient_id").in("patient_id", pids);
        const orderPids = new Set(orders?.map(o => o.patient_id) || []);
        for (const i of intakes) {
          if (i.line_id && !orderPids.has(i.patient_id)) lineIds.push(i.line_id);
        }
        if (intakes.length < 1000) break;
        from += 1000;
      }
    }

    const uniqueIds = Array.from(new Set(lineIds));
    console.log(`${tag} Step5: ${uniqueIds.length} users found`);
    let linked = 0, failed = 0;
    for (let i = 0; i < uniqueIds.length; i += 500) {
      const batch = uniqueIds.slice(i, i + 500);
      const res = await fetch(`${LINE_API}/richmenu/bulk/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${lineToken}` },
        body: JSON.stringify({ richMenuId, userIds: batch }),
      });
      if (res.ok) linked += batch.length;
      else {
        for (const uid of batch) {
          const r = await fetch(`${LINE_API}/user/${uid}/richmenu/${richMenuId}`, { method: "POST", headers: { Authorization: `Bearer ${lineToken}` } });
          if (r.ok) linked++; else failed++;
        }
      }
    }
    console.log(`${tag} Step5: Re-linked ${linked} (failed: ${failed})`);
  }

  // Step 6: 旧メニュー削除
  if (oldLineMenuId && oldLineMenuId !== richMenuId) {
    console.log(`${tag} Step6: Deleting old menu ${oldLineMenuId}`);
    const delRes = await fetch(`${LINE_API}/richmenu/${oldLineMenuId}`, { method: "DELETE", headers: { Authorization: `Bearer ${lineToken}` } });
    console.log(`${tag} Step6 ${delRes.ok ? "OK" : "FAILED: " + delRes.status}`);
  }

  console.log(`${tag} DONE: ${richMenuId}`);
  return true;
}

// メイン処理
const query = supabase.from("rich_menus").select("*").order("id");
if (targetId) query.eq("id", targetId);
const { data: menus, error } = await query;
if (error) { console.error("DB取得エラー:", error.message); process.exit(1); }

console.log(`=== リッチメニュー手動同期 (${menus.length}件) ===`);
for (const menu of menus) {
  if (!menu.image_url) { console.log(`[${menu.name}] スキップ（画像なし）`); continue; }
  await syncMenu(menu);
}
console.log("\n=== 完了 ===");
