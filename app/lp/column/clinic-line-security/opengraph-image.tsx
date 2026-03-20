import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのLINE運用セキュリティガイド — 個人情報保護と安全な運用方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのLINE運用セキュリティガイド — 個人情報保護と安全な運用方法",
    category: "ガイド",
    description:
      "クリニックがLINE公式アカウントを運用する際のセキュリティ対策を解説。個人情報保護法への対応・スタッフ権限管理・患者データの安全な取り扱い方法を紹介。",
  });
}
