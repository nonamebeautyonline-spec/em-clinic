import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "Stripe×LINE連携で決済完了率を上げる — 決済フロー最適化の実践ガイド", category: "成功事例・売上UP", description: "Stripe決済とLINE通知を連携し、決済完了率を改善する方法を解説。", brandName: "Lオペ for EC" });
}
