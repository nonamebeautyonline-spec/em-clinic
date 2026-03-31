import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのLINEリッチメニュー設計 — 患者導線を最適化する5つのポイント";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニックのLINEリッチメニュー設計 — 患者導線を最適化する5つのポイント",
    category: "ガイド",
    description:
      "クリニックのLINE公式アカウントにおけるリッチメニューの設計方法を解説。予約・問診・お知らせなど、患者が迷わず目的の機能にたどり着くUI設計のポイントを紹介。",
  });
}
