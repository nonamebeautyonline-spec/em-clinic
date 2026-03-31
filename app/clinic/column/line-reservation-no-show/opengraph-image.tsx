import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "LINE予約管理で無断キャンセルを削減 — クリニックの予約運用改善ガイド";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "LINE予約管理で無断キャンセルを削減 — クリニックの予約運用改善ガイド",
    category: "業務改善",
    description:
      "LINEを活用した予約管理で無断キャンセル（ノーショー）を大幅削減する方法を解説。自動リマインド・簡単変更・キャンセル待ち管理の具体的な施策を紹介。",
  });
}
