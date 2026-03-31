import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINEフォーム機能活用術 — アンケート・申込みフォームの効果的な使い方", category: "自動化・効率化", description: "LINE公式アカウントのフォーム機能を活用したアンケート・申込みフォームの作成方法と収集データの活用法を紹介", brandName: "Lオペ" });
}
