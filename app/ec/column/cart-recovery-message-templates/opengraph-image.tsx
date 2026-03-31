import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "カゴ落ちリマインドのメッセージテンプレート10選 — 業態別の最適な表現", category: "カゴ落ち対策", description: "カゴ落ちリマインドのメッセージ文面を業態別に10パターン紹介。回収率を高めるメッセージ設計のコツ。", brandName: "Lオペ for EC" });
}
