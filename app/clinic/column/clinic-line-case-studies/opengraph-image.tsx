import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのLINE公式アカウント活用事例5選 — 業務効率化と患者満足度向上の実践例";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニックのLINE公式アカウント活用事例5選 — 業務効率化と患者満足度向上の実践例",
    category: "活用事例",
    description:
      "LINE公式アカウントを活用してクリニック業務を効率化した5つの事例を紹介。予約管理・再診促進・問診自動化など、具体的な成果と導入のポイントを解説します。",
  });
}
