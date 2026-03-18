import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの電子カルテ選び方ガイド — LINE連携で業務効率化";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの電子カルテ選び方ガイド — LINE連携で業務効率化",
    category: "ガイド",
    description:
      "クリニック向け電子カルテの選び方を徹底解説。LINE公式アカウントとの連携で予約・問診・カルテ記録を一元管理し、業務効率を最大化する方法を紹介。",
  });
}
