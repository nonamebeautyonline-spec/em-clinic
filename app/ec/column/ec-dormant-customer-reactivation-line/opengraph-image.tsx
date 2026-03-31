import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "ECの休眠顧客をLINEで復帰させる5つのシナリオ — 再購入率を3倍にする方法", category: "顧客管理・CRM", description: "休眠顧客に対するLINE復帰シナリオを5パターン紹介。再購入率を3倍に引き上げる実践手法。", brandName: "Lオペ for EC" });
}
