import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "マンジャロとリバウンド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "マンジャロとリバウンド\nやめたら太る？休薬のコツ",
    category: "医薬品解説",
    description: "段階的な休薬法・リベルサス維持移行・体重維持の方法",
  });
}
