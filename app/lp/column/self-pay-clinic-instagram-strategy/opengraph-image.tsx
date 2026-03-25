import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "自費クリニックのInstagram運用戦略 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "自費クリニックの\nInstagram運用戦略",
    category: "マーケティング",
    description: "フォロワー獲得から来院につなげる投稿設計",
  });
}
