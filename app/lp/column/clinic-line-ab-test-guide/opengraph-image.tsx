import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "LINE配信のA/Bテスト実践ガイド — クリニックの開封率・来院率を改善する検証方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "LINE配信のA/Bテスト実践ガイド — クリニックの開封率・来院率を改善する検証方法",
    category: "マーケティング",
    description:
      "クリニックのLINE配信におけるA/Bテストの設計から実行・分析まで実践的に解説。配信時間・メッセージ文面・リッチメニュー・CTAの検証方法と改善サイクルの回し方を紹介。",
  });
}
