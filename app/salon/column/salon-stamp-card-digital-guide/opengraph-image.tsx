import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのスタンプカードをLINEでデジタル化 — 導入方法と効果を最大化するコツ", category: "顧客管理・CRM", description: "サロンの紙のポイントカードをLINEのデジタルスタンプカードに移行する方法を解説。", brandName: "Lオペ for SALON" });
}
