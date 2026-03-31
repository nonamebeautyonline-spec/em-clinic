import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "自費クリニックの損益分岐点と収支管理 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "自費クリニックの\n損益分岐点と収支管理",
    category: "経営戦略",
    description: "月次で見るべき経営指標と改善アクション",
  });
}
