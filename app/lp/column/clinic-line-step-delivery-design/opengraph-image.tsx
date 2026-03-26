import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "LINE ステップ配信の設計方法 — クリニックの初診後フォローから定期来院促進まで";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "LINE ステップ配信の設計方法 — クリニックの初診後フォローから定期来院促進まで",
    category: "マーケティング",
    description:
      "初診後7日→30日→90日のフォローシナリオ、診療科別配信例、離脱防止シナリオ、フロービルダー活用法を解説。",
  });
}
