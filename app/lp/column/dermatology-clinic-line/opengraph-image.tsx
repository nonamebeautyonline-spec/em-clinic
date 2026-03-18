import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "皮膚科クリニックのLINE活用 — 処方薬配送とフォローアップ自動化";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "皮膚科クリニックのLINE活用 — 処方薬配送とフォローアップ自動化",
    category: "活用事例",
    description:
      "皮膚科クリニックに特化したLINE公式アカウントの活用方法を解説。処方薬のオンライン決済・配送管理からフォローアップメッセージの自動化まで、皮膚科特有の業務効率化を紹介。",
  });
}
