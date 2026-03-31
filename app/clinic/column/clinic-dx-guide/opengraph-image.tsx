import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックDX完全ガイド — LINE公式アカウントから始める業務デジタル化";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニックDX完全ガイド — LINE公式アカウントから始める業務デジタル化",
    category: "ガイド",
    description:
      "クリニックのDX（デジタルトランスフォーメーション）をLINE公式アカウントから始める方法を完全解説。予約・問診・会計・配送まで段階的にデジタル化するロードマップを紹介。",
  });
}
