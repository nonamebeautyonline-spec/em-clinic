/**
 * LINE リッチメニュー再作成スクリプト
 *
 * DB id=1 "処方後" と id=2 "個人情報入力前" を LINE API に再登録し、
 * デフォルトメニュー設定 + 孤立メニュー削除を行う
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const TOKEN =
  process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN ||
  process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN;
const ORIGIN = process.env.NEXT_PUBLIC_BASE_URL || "https://app.noname-beauty.jp";

const LINE_API = "https://api.line.me/v2/bot";
const LINE_DATA_API = "https://api-data.line.me/v2/bot";

// ───────────── アクション変換（lib/line-richmenu.ts と同一ロジック）─────────────
function mapActionToLine(action, origin) {
  switch (action.type) {
    case "uri":
      return {
        type: "uri",
        uri: action.uri || "https://line.me",
        label: action.label || "リンク",
      };
    case "tel":
      return {
        type: "uri",
        uri: action.tel?.startsWith("tel:") ? action.tel : `tel:${action.tel || ""}`,
        label: action.label || "電話",
      };
    case "message":
      return { type: "message", text: action.text || "メッセージ" };
    case "form":
      return {
        type: "uri",
        uri: `${origin}/forms/${action.formSlug || ""}`,
        label: action.label || "フォーム",
      };
    case "action":
      return {
        type: "postback",
        data: JSON.stringify({
          type: "rich_menu_action",
          actions: action.actions || [],
          userMessage: action.userMessage || "",
        }),
        displayText: action.userMessage || undefined,
      };
    default:
      return { type: "postback", data: JSON.stringify({ type: action.type || "noop" }) };
  }
}

// ───────────── LINE API ヘルパー ─────────────
async function createLineRichMenu(menu) {
  const sizeHeight = menu.size_type === "half" ? 843 : 1686;
  const areas = (menu.areas || []).map((a) => {
    // LINE APIはbounds値が0以上必須。負の値をクランプ
    const b = a.bounds;
    const x = Math.max(0, b.x);
    const y = Math.max(0, b.y);
    // 負分だけwidthを縮める
    const width = b.width - (x - b.x);
    const height = b.height - (y - b.y);
    return {
      bounds: { x, y, width, height },
      action: mapActionToLine(a.action, ORIGIN),
    };
  });
  if (areas.length === 0) {
    areas.push({
      bounds: { x: 0, y: 0, width: 2500, height: sizeHeight },
      action: { type: "message", text: "メニュー" },
    });
  }

  const body = {
    size: { width: 2500, height: sizeHeight },
    selected: menu.selected,
    name: menu.name.slice(0, 300),
    chatBarText: (menu.chat_bar_text || "メニュー").slice(0, 14),
    areas,
  };

  const res = await fetch(`${LINE_API}/richmenu`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("  ❌ Menu create failed:", res.status, text);
    return null;
  }
  const data = await res.json();
  return data.richMenuId;
}

async function uploadImage(richMenuId, imageUrl) {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.error("  ❌ Image download failed:", imageUrl, imgRes.status);
    return false;
  }
  const ct = imgRes.headers.get("content-type") || "image/png";
  const buf = await imgRes.arrayBuffer();
  const res = await fetch(`${LINE_DATA_API}/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { "Content-Type": ct, Authorization: `Bearer ${TOKEN}` },
    body: buf,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("  ❌ Image upload failed:", res.status, text);
    return false;
  }
  return true;
}

async function setDefaultMenu(richMenuId) {
  const res = await fetch(`${LINE_API}/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
  });
  return res.ok;
}

async function deleteMenu(richMenuId) {
  const res = await fetch(`${LINE_API}/richmenu/${richMenuId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return res.ok;
}

// ───────────── メイン処理 ─────────────
async function main() {
  if (!TOKEN) {
    console.error("LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN が必要です");
    process.exit(1);
  }

  // 1. DB からメニュー取得
  const { data: dbMenus } = await sb.from("rich_menus").select("*").order("id");
  console.log("=== DB メニュー ===");
  for (const m of dbMenus) {
    console.log(`  id=${m.id} "${m.name}" line_id=${m.line_rich_menu_id || "(なし)"} selected=${m.selected}`);
  }

  // 2. LINE 上の既存メニュー一覧
  const listRes = await fetch(`${LINE_API}/richmenu/list`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const { richmenus: lineMenus } = await listRes.json();
  console.log("\n=== LINE 上のメニュー ===");
  for (const m of lineMenus || []) {
    console.log(`  ${m.richMenuId} "${m.name}"`);
  }
  const existingLineIds = new Set((lineMenus || []).map((m) => m.richMenuId));

  // 3. 再作成が必要なメニューを特定
  const toRecreate = dbMenus.filter(
    (m) => !m.line_rich_menu_id || !existingLineIds.has(m.line_rich_menu_id)
  );

  if (toRecreate.length === 0) {
    console.log("\n✅ 全メニューが LINE 上に存在しています。再作成不要。");
  } else {
    console.log(`\n⚙️  ${toRecreate.length} 件のメニューを LINE に再作成します...`);
    for (const menu of toRecreate) {
      console.log(`\n--- id=${menu.id} "${menu.name}" ---`);

      // LINE APIにメニュー作成
      const newLineId = await createLineRichMenu(menu);
      if (!newLineId) continue;
      console.log(`  ✅ LINE メニュー作成: ${newLineId}`);

      // 画像アップロード
      if (menu.image_url) {
        const ok = await uploadImage(newLineId, menu.image_url);
        if (ok) {
          console.log(`  ✅ 画像アップロード完了`);
        }
      }

      // DB 更新
      const { error } = await sb
        .from("rich_menus")
        .update({ line_rich_menu_id: newLineId, is_active: true })
        .eq("id", menu.id);
      if (error) {
        console.error(`  ❌ DB更新失敗:`, error.message);
      } else {
        console.log(`  ✅ DB 更新完了 (line_rich_menu_id = ${newLineId})`);
        menu.line_rich_menu_id = newLineId; // in-memory update
      }
    }
  }

  // 4. デフォルトメニュー設定（selected=true のメニュー）
  const defaultMenu = dbMenus.find((m) => m.selected && m.line_rich_menu_id);
  if (defaultMenu) {
    console.log(`\n⚙️  デフォルトメニュー設定: id=${defaultMenu.id} "${defaultMenu.name}"`);
    const ok = await setDefaultMenu(defaultMenu.line_rich_menu_id);
    console.log(ok ? "  ✅ デフォルトメニュー設定完了" : "  ❌ デフォルトメニュー設定失敗");
  }

  // 5. 孤立メニュー削除（LINE上に存在するがDBにないメニュー）
  const dbLineIds = new Set(dbMenus.map((m) => m.line_rich_menu_id).filter(Boolean));
  const orphans = (lineMenus || []).filter((m) => !dbLineIds.has(m.richMenuId));
  if (orphans.length > 0) {
    console.log(`\n⚙️  孤立メニュー ${orphans.length} 件を削除...`);
    for (const o of orphans) {
      console.log(`  削除: ${o.richMenuId} "${o.name}"`);
      const ok = await deleteMenu(o.richMenuId);
      console.log(ok ? "  ✅ 削除完了" : "  ❌ 削除失敗");
    }
  }

  // 6. 確認: 最終状態
  const finalListRes = await fetch(`${LINE_API}/richmenu/list`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const { richmenus: finalMenus } = await finalListRes.json();
  console.log("\n=== 最終状態: LINE 上のメニュー ===");
  for (const m of finalMenus || []) {
    console.log(`  ${m.richMenuId} "${m.name}"`);
  }

  const defRes = await fetch(`${LINE_API}/user/all/richmenu`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (defRes.ok) {
    const d = await defRes.json();
    console.log(`\nデフォルトメニュー: ${d.richMenuId}`);
  } else {
    console.log("\nデフォルトメニュー: 未設定");
  }

  console.log("\n✅ 完了");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
