import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "アトピー性皮膚炎のオンライン管理 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "アトピー性皮膚炎の\nオンライン管理",
    category: "活用事例",
    description: "ステロイド外用・保湿指導・フォローアップ設計",
  });
}
