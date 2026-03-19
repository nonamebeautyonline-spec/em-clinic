import type { ReactNode } from "react";
import type { Friend, MarkOption } from "./types";

export const MAX_PINS = 15;
export const PAGE_SIZE = 50;
export const MSG_BATCH = 25;

export const DEFAULT_MARK_OPTIONS: MarkOption[] = [
  { value: "none", label: "未対応", color: "#06B6D4", icon: "●" },
];

// コンポーネント外のユーティリティ関数（参照安定化）
export function formatTimeUtil(s: string) {
  const d = new Date(s);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDateShortUtil(s: string) {
  const d = new Date(s);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return formatTimeUtil(s);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "昨日";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDateUtil(s: string) {
  const d = new Date(s);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "今日";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "昨日";
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function sortByLatestUtil(a: Friend, b: Friend) {
  const ta = a.last_text_at ? new Date(a.last_text_at).getTime() : (a.last_sent_at ? new Date(a.last_sent_at).getTime() : 0);
  const tb = b.last_text_at ? new Date(b.last_text_at).getTime() : (b.last_sent_at ? new Date(b.last_sent_at).getTime() : 0);
  return tb - ta;
}

export function getMarkColorUtil(markOptions: MarkOption[], mark: string) {
  return markOptions.find(m => m.value === mark)?.color || "#06B6D4";
}

export function getMarkLabelUtil(markOptions: MarkOption[], mark: string) {
  return markOptions.find(m => m.value === mark)?.label || "未対応";
}

// 右カラム表示セクション定義
export const RIGHT_COLUMN_SECTIONS = [
  { key: "personal", label: "個人情報" },
  { key: "reservation", label: "次回予約" },
  { key: "mark", label: "対応マーク" },
  { key: "tags", label: "タグ" },
  { key: "friendFields", label: "友だち情報" },
  { key: "medical", label: "問診事項" },
  { key: "latestOrder", label: "最新決済" },
  { key: "orderHistory", label: "処方履歴" },
  { key: "bankTransfer", label: "銀行振込待ち" },
  { key: "reorders", label: "再処方" },
  { key: "richMenu", label: "リッチメニュー" },
] as const;

// 画像URL判定（Supabase storage の画像URLか、【テンプレ名】URL形式か）
export function isImageUrl(text: string) {
  if (!text) return false;
  const url = extractImageUrl(text);
  if (!url.startsWith("http")) return false;
  if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url)) return true;
  if (url.includes("supabase.co/storage/") && url.includes("line-images/")) return true;
  return false;
}

// 【テンプレ名】URL形式からURLを抽出（なければそのまま返す）
export function extractImageUrl(text: string) {
  if (!text) return "";
  const trimmed = text.trim();
  const m = trimmed.match(/^【.+?】(.+)/);
  return m ? m[1].trim() : trimmed;
}

// スタンプ判定・パース
export function isStickerContent(text: string): boolean {
  return /^\[スタンプ\] packageId=\d+ stickerId=\d+$/.test(text?.trim());
}

export function getStickerImageUrl(text: string): string | null {
  const m = text?.match(/stickerId=(\d+)/);
  return m ? `https://stickershop.line-scdn.net/stickershop/v1/sticker/${m[1]}/iPhone/sticker.png` : null;
}

// テキスト内URLをクリック可能にする
export function linkifyContent(text: string): ReactNode {
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 break-all">{part}</a>
    ) : part
  );
}
