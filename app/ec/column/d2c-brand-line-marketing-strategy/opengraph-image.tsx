import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "D2CブランドのLINEマーケティング戦略 — ファン育成から売上拡大まで", category: "業態別活用事例", description: "D2CブランドがLINEを活用してファンコミュニティを育成し、売上を拡大する戦略を解説。", brandName: "Lオペ for EC" });
}
