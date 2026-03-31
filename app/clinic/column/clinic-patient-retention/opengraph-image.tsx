import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの患者離脱を防ぐ — LINEフォローアップで継続通院を促進する方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの患者離脱を防ぐ — LINEフォローアップで継続通院を促進する方法",
    category: "マーケティング",
    description:
      "クリニックの患者離脱を防止するLINEフォローアップ戦略を解説。離脱しやすいタイミングの特定・自動フォローメッセージ・再来院促進キャンペーンなど、継続通院を促す具体策を紹介。",
  });
}
