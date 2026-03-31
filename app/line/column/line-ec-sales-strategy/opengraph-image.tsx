import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "ECサイトのLINE活用戦略 — カゴ落ち対策から再購入促進まで", category: "業種別活用事例", description: "ECサイトがLINE公式アカウントを活用して売上を伸ばす戦略を解説。カゴ落ちリマインド・再購入促進・セール告知など、EC特有のLINE活用パターンを紹介。", brandName: "Lオペ for LINE" });
}
