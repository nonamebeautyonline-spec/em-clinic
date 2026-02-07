// lib/line-richmenu.ts
// LINE Rich Menu API ヘルパー

const LINE_API = "https://api.line.me/v2/bot";
const LINE_DATA_API = "https://api-data.line.me/v2/bot";

function getToken() {
  return process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
}

interface RichMenuArea {
  bounds: { x: number; y: number; width: number; height: number };
  action: {
    type: string;
    uri?: string;
    tel?: string;
    text?: string;
    label?: string;
    displayMethod?: string;
    actions?: any[];
    userMessage?: string;
    formSlug?: string;
  };
}

/**
 * 管理画面のアクション定義をLINE APIのアクション形式に変換
 */
function mapActionToLine(action: RichMenuArea["action"], origin: string) {
  switch (action.type) {
    case "uri":
      return {
        type: "uri" as const,
        uri: action.uri || "https://line.me",
        label: action.label || "リンク",
      };
    case "tel":
      return {
        type: "uri" as const,
        uri: action.tel?.startsWith("tel:") ? action.tel : `tel:${action.tel || ""}`,
        label: action.label || "電話",
      };
    case "message":
      return {
        type: "message" as const,
        text: action.text || "メッセージ",
      };
    case "form":
      return {
        type: "uri" as const,
        uri: `${origin}/forms/${action.formSlug || ""}`,
        label: action.label || "フォーム",
      };
    case "action":
      return {
        type: "postback" as const,
        data: JSON.stringify({
          type: "rich_menu_action",
          actions: action.actions || [],
          userMessage: action.userMessage || "",
        }),
        displayText: action.userMessage || undefined,
      };
    default:
      // other / 未対応 → postback
      return {
        type: "postback" as const,
        data: JSON.stringify({ type: action.type || "noop" }),
      };
  }
}

/**
 * LINE APIにリッチメニューオブジェクトを作成
 * @returns richMenuId or null
 */
export async function createLineRichMenu(menu: {
  name: string;
  chat_bar_text: string;
  selected: boolean;
  size_type: string;
  areas: RichMenuArea[];
}, origin: string): Promise<string | null> {
  const token = getToken();
  if (!token) {
    console.error("[LINE Rich Menu] No access token configured");
    return null;
  }

  const sizeHeight = menu.size_type === "half" ? 843 : 1686;

  const areas = (menu.areas || []).map((area) => ({
    bounds: area.bounds,
    action: mapActionToLine(area.action, origin),
  }));

  // LINE APIは最低1つのareaが必要
  if (areas.length === 0) {
    areas.push({
      bounds: { x: 0, y: 0, width: 2500, height: sizeHeight },
      action: { type: "message" as const, text: "メニュー" },
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
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[LINE Rich Menu Create]", res.status, text);
    return null;
  }

  const data = await res.json();
  return data.richMenuId || null;
}

/**
 * リッチメニュー画像をLINEにアップロード
 */
export async function uploadRichMenuImage(richMenuId: string, imageUrl: string): Promise<boolean> {
  const token = getToken();
  if (!token || !imageUrl) return false;

  // 画像をダウンロード
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.error("[LINE Rich Menu Image] Failed to download:", imageUrl, imgRes.status);
    return false;
  }

  const contentType = imgRes.headers.get("content-type") || "image/png";
  const buffer = await imgRes.arrayBuffer();

  // LINEにアップロード (JPEG or PNG, 1MB以下推奨)
  const res = await fetch(`${LINE_DATA_API}/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      Authorization: `Bearer ${token}`,
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[LINE Rich Menu Image Upload]", res.status, text);
    return false;
  }

  return true;
}

/**
 * LINE側のリッチメニューを削除
 */
export async function deleteLineRichMenu(richMenuId: string): Promise<boolean> {
  const token = getToken();
  if (!token || !richMenuId) return false;

  const res = await fetch(`${LINE_API}/richmenu/${richMenuId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[LINE Rich Menu Delete]", res.status, text);
    return false;
  }
  return true;
}

/**
 * 全ユーザーのデフォルトリッチメニューに設定
 */
export async function setDefaultRichMenu(richMenuId: string): Promise<boolean> {
  const token = getToken();
  if (!token || !richMenuId) return false;

  const res = await fetch(`${LINE_API}/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[LINE Set Default Menu]", res.status, text);
    return false;
  }
  return true;
}
