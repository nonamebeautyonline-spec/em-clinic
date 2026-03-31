import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "生活習慣病のオンライン管理ビジネス — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "生活習慣病の\nオンライン管理ビジネス",
    category: "経営戦略",
    description: "高血圧・糖尿病・脂質異常症の継続処方モデル",
  });
}
