import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "美容皮膚科のオンライン診療活用 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "美容皮膚科の\nオンライン診療活用",
    category: "活用事例",
    description: "対面施術×オンライン処方のハイブリッド運用",
  });
}
