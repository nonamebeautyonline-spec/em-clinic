import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "眼科クリニックのLINE活用術 — コンタクト処方・定期検診管理の効率化";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "眼科クリニックのLINE活用術 — コンタクト処方・定期検診管理の効率化",
    category: "活用事例",
    description:
      "眼科クリニックに特化したLINE公式アカウントの活用方法を解説。コンタクトレンズ処方リマインド・定期検診管理・術後フォローなど、眼科特有の業務をLINEで効率化する方法を紹介。",
  });
}
