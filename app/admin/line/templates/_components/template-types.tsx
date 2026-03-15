import type { FlexPreset } from "@/app/admin/line/flex-builder/page";

/* ---------- 型定義 ---------- */

export interface Template {
  id: number;
  name: string;
  content: string;
  message_type: string;
  category: string | null;
  flex_content: Record<string, unknown> | null;
  imagemap_actions: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  sort_order: number;
}

export type TemplateTab = "text" | "image" | "carousel" | "flex" | "imagemap";

export interface PanelButton {
  label: string;
  actionType: "url" | "postback" | "message";
  actionValue: string;
}

export interface CarouselPanel {
  title: string;
  body: string;
  imageUrl: string;
  buttons: PanelButton[];
  qaMode?: boolean;
  subtitle?: string;
  headerColor?: string;
  items?: string[];
  categoryId?: string;
}

export type TestAccount = {
  patient_id: string;
  patient_name: string;
  has_line_uid: boolean;
};

export { type FlexPreset };

/* ---------- 定数 ---------- */

export const EMPTY_BUTTON: PanelButton = { label: "", actionType: "url", actionValue: "" };
export const EMPTY_PANEL: CarouselPanel = { title: "", body: "", imageUrl: "", buttons: [{ ...EMPTY_BUTTON }] };

export const QA_PAGE_URL = "/mypage/qa";
export const QA_COLOR_PRESETS = [
  { label: "ピンク", value: "#ec4899" },
  { label: "青", value: "#3b82f6" },
  { label: "オレンジ", value: "#f59e0b" },
  { label: "シアン", value: "#06b6d4" },
  { label: "紫", value: "#8b5cf6" },
  { label: "インディゴ", value: "#6366f1" },
];

export const EMPTY_QA_PANEL: CarouselPanel = {
  title: "", body: "", imageUrl: "", buttons: [],
  qaMode: true, subtitle: "", headerColor: "#ec4899", items: [""], categoryId: "",
};

export const TEMPLATES_KEY = "/api/admin/line/templates";
export const CATEGORIES_KEY = "/api/admin/line/template-categories";
export const PRESETS_KEY = "/api/admin/line/flex-presets";
export const TEST_ACCOUNT_KEY = "/api/admin/line/test-account";

/* ---------- ユーティリティ関数 ---------- */

/** Flex送信前にバブルの type:"bubble" を補完（LINE API必須） */
export function fixFlexForSend(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(fixFlexForSend);
  const o = data as Record<string, unknown>;
  if (o.type === "carousel" && Array.isArray(o.contents)) {
    return { ...o, contents: o.contents.map(fixFlexForSend) };
  }
  if ((o.header || o.hero || o.body || o.footer) && o.type !== "bubble") {
    return { ...o, type: "bubble" };
  }
  return o;
}

/** Q&AスタイルのFlexか判定 */
export function isQaStyleFlex(flex: Record<string, unknown> | null): boolean {
  if (!flex) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = flex as any;
  if (f.type !== "carousel" || !Array.isArray(f.contents) || f.contents.length < 2) return false;
  const first = f.contents[0];
  if (!first.header || !first.body) return false;
  const hdr = first.header;
  if (!hdr.backgroundColor) return false;
  const bodyItems = first.body.contents;
  if (!Array.isArray(bodyItems) || bodyItems.length === 0) return false;
  return bodyItems[0]?.layout === "horizontal" && bodyItems[0]?.contents?.length === 2;
}

/** Q&A Flex JSON → CarouselPanel[] に変換 */
export function qaFlexToPanels(flex: Record<string, unknown>): CarouselPanel[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = flex as any;
  const bubbles = f.contents as any[];
  const panels: CarouselPanel[] = [];
  for (const b of bubbles) {
    if (!b.header) continue;
    const title = b.header.contents?.[0]?.text || "";
    const subtitle = b.header.contents?.[1]?.text || "";
    const headerColor = b.header.backgroundColor || "#ec4899";
    const items: string[] = [];
    if (b.body?.contents) {
      for (const row of b.body.contents) {
        if (row.layout === "horizontal" && row.contents?.[1]?.text) {
          items.push(row.contents[1].text);
        }
      }
    }
    let categoryId = "";
    if (b.footer?.contents) {
      for (const fc of b.footer.contents) {
        if (fc.action?.uri) {
          const match = fc.action.uri.match(/[?&]c=([^&]+)/);
          if (match) categoryId = match[1];
        }
      }
    }
    panels.push({
      title, body: "", imageUrl: "", buttons: [],
      qaMode: true, subtitle, headerColor, items, categoryId,
    });
  }
  return panels;
}

/** Q&A CarouselPanel[] → Flex JSON に変換 */
export function qaPanelsToFlex(panels: CarouselPanel[]): Record<string, unknown> {
  const bubbles = panels.map(p => ({
    type: "bubble",
    size: "mega",
    header: {
      type: "box", layout: "vertical",
      contents: [
        { type: "text", text: p.title || "タイトル", weight: "bold", size: "xl", color: "#ffffff" },
        { type: "text", text: p.subtitle || "", size: "sm", color: "#ffffffcc", margin: "sm" },
      ],
      backgroundColor: p.headerColor || "#ec4899",
      paddingAll: "20px",
    },
    body: {
      type: "box", layout: "vertical",
      contents: (p.items || []).map((item, i) => ({
        type: "box", layout: "horizontal",
        contents: [
          { type: "box", layout: "vertical", contents: [{ type: "text", text: "●", size: "xxs", color: p.headerColor || "#ec4899" }], width: "16px", paddingTop: "4px" },
          { type: "text", text: item, size: "sm", color: "#444444", wrap: true, flex: 1 },
        ],
        ...(i > 0 ? { margin: "12px" } : {}),
      })),
      paddingAll: "20px", spacing: "none",
    },
    footer: {
      type: "box", layout: "vertical",
      contents: [
        { type: "separator", color: "#f0f0f0" },
        {
          type: "button",
          action: { type: "uri", label: "詳しく見る →", uri: `${QA_PAGE_URL}?c=${p.categoryId || "getting-started"}` },
          style: "link", color: p.headerColor || "#ec4899", height: "sm", margin: "sm",
        },
      ],
      paddingAll: "12px",
    },
  }));

  const moreBubble = {
    type: "bubble", size: "mega",
    body: {
      type: "box", layout: "vertical",
      contents: [
        { type: "box", layout: "vertical", contents: [{ type: "text", text: "💬", size: "4xl", align: "center" }], paddingTop: "20px" },
        { type: "text", text: "すべてのQ&Aを見る", weight: "bold", size: "lg", align: "center", margin: "xl", color: "#333333" },
        { type: "text", text: "7カテゴリ・全25問の\nよくある質問をまとめています", size: "sm", align: "center", color: "#888888", wrap: true, margin: "lg" },
        { type: "separator", margin: "xl", color: "#f1f5f9" },
        { type: "box", layout: "vertical", contents: [
          { type: "text", text: "ご利用の流れ｜予約・診察", size: "xs", align: "center", color: "#94a3b8" },
          { type: "text", text: "お支払い｜配送｜再処方", size: "xs", align: "center", color: "#94a3b8", margin: "xs" },
          { type: "text", text: "SMS認証・アカウント｜問診", size: "xs", align: "center", color: "#94a3b8", margin: "xs" },
        ], margin: "lg" },
      ],
      justifyContent: "center", paddingAll: "20px",
    },
    footer: {
      type: "box", layout: "vertical",
      contents: [
        { type: "button", action: { type: "uri", label: "Q&Aページを開く", uri: QA_PAGE_URL }, style: "primary", color: "#ec4899", height: "sm" },
        { type: "text", text: "Q&Aで解決しない場合や、薬に関する\n医学的な相談はトーク画面からお気軽にご相談ください", size: "xs", color: "#888888", align: "center", wrap: true, margin: "lg" },
      ],
      paddingAll: "16px",
    },
  };

  return { type: "carousel", contents: [...bubbles, moreBubble] };
}

/** カルーセルパネルからLINE Flex Message JSONを生成 */
export function panelsToFlex(panels: CarouselPanel[]): Record<string, unknown> {
  const bubbles = panels.map(panel => {
    const bodyContents: Record<string, unknown>[] = [];
    if (panel.title) {
      bodyContents.push({ type: "text", text: panel.title, weight: "bold", size: "lg", wrap: true });
    }
    if (panel.body) {
      bodyContents.push({ type: "text", text: panel.body, size: "sm", color: "#666666", wrap: true, margin: "md" });
    }
    const footerContents: Record<string, unknown>[] = panel.buttons
      .filter(b => b.label.trim())
      .map(b => ({
        type: "button",
        style: "primary",
        color: "#06C755",
        action: b.actionType === "url"
          ? { type: "uri", label: b.label, uri: b.actionValue || "https://example.com" }
          : b.actionType === "postback"
            ? { type: "postback", label: b.label, data: b.actionValue }
            : { type: "message", label: b.label, text: b.actionValue || b.label },
      }));

    const bubble: Record<string, unknown> = { type: "bubble" };
    if (panel.imageUrl) {
      bubble.hero = { type: "image", url: panel.imageUrl, size: "full", aspectRatio: "20:13", aspectMode: "cover" };
    }
    if (bodyContents.length > 0) {
      bubble.body = { type: "box", layout: "vertical", contents: bodyContents, spacing: "sm" };
    }
    if (footerContents.length > 0) {
      bubble.footer = { type: "box", layout: "vertical", contents: footerContents, spacing: "sm" };
    }
    return bubble;
  });

  if (bubbles.length === 1) return bubbles[0];
  return { type: "carousel", contents: bubbles };
}

/** 日付フォーマット */
export function formatDate(d: string) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

/** テンプレート変数ハイライト表示 */
export function HighlightVariables({ text }: { text: string }) {
  const parts = text.split(/(\{[^}]+\})/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\{[^}]+\}$/.test(part) ? (
          <span key={i} className="bg-blue-100 text-blue-700 rounded px-0.5 font-mono text-xs">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
