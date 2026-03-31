import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "EC事業者のためのLINE vs メールマーケティング徹底比較 — 開封率3倍の理由", category: "EC×LINE活用入門", description: "ECサイトのマーケティングチャネルとしてLINEとメールを徹底比較。開封率・クリック率・CV率のデータ解説。", brandName: "Lオペ for EC" });
}
