import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({
    title: "LINE@とLINE公式アカウントの違い — 統合後の変更点と移行ガイド",
    category: "LINE公式アカウント入門",
    description: "旧LINE@からLINE公式アカウントへの統合で何が変わったのか。料金体系・機能・API対応の違いを整理し、移行時の注意点と新機能の活用法を解説します。",
    brandName: "Lオペ for LINE",
  });
}
