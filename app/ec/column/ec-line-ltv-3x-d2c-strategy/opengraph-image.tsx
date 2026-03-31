import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "D2CブランドのLINE活用で顧客LTVを3倍にした戦略 — CRM構築から成果まで", category: "成功事例・売上UP", description: "D2CブランドがLINE×CRMで顧客LTVを3倍に引き上げた戦略の全貌。", brandName: "Lオペ for EC" });
}
