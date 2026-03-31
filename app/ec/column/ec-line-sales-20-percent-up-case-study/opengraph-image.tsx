import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "カゴ落ち対策で月商20%アップ — EC×LINE成功事例5選", category: "成功事例・売上UP", description: "LINEのカゴ落ち対策で月商を20%以上アップさせたEC事業者の成功事例5選。", brandName: "Lオペ for EC" });
}
