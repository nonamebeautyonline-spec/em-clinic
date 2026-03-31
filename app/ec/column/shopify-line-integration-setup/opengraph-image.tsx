import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "Shopify×LINE連携の設定方法 — ECカートとLINE公式アカウントを接続するステップガイド", category: "EC×LINE活用入門", description: "ShopifyとLINE公式アカウントを連携する具体的な手順を解説。Webhook設定からカゴ落ち通知の自動化まで。", brandName: "Lオペ for EC" });
}
