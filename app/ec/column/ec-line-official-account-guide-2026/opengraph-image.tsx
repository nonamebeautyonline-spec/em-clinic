import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "ECサイトのLINE公式アカウント活用入門 — 開設から売上貢献までの完全ガイド", category: "EC×LINE活用入門", description: "ECサイトでLINE公式アカウントを活用するための完全ガイド。アカウント開設からECカート連携、初回配信設計まで解説。", brandName: "Lオペ for EC" });
}
