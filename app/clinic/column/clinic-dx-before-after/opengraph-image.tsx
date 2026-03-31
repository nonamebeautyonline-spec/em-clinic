import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "クリニックDX導入ビフォーアフター — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックDX導入\nビフォーアフター",
    category: "活用事例",
    description: "数値とスタッフの声で見る変化の全記録",
  });
}
