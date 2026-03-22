import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "不眠症・睡眠薬のオンライン処方ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "不眠症・睡眠薬の\nオンライン処方ガイド",
    category: "活用事例",
    description: "定期フォローで安全管理とリピートを両立",
  });
}
