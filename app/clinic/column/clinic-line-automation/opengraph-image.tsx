import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのLINE自動化完全ガイド — 手動業務をゼロにする設定方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのLINE自動化完全ガイド — 手動業務をゼロにする設定方法",
    category: "ガイド",
    description:
      "予約リマインド・フォローアップ・AI返信・セグメント配信の自動化設定手順と効果を紹介。",
  });
}
