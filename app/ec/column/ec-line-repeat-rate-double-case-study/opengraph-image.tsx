import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINE配信でリピート率を2倍にしたEC事業者の施策 — 成功パターンと再現方法", category: "成功事例・売上UP", description: "LINEのセグメント配信・シナリオ配信でリピート率を2倍に引き上げたEC事業者の実例。", brandName: "Lオペ for EC" });
}
