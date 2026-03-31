import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({
    title: "LINE公式アカウント開設後にやるべき初期設定10のこと",
    category: "LINE公式アカウント入門",
    description: "LINE公式アカウントを開設したら最初にやるべき10の初期設定を優先度順に解説。あいさつメッセージ、リッチメニュー、応答設定など、運用開始前に必ず押さえるポイントを紹介します。",
    brandName: "Lオペ for LINE",
  });
}
