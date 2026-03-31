import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "RFM分析×LINEセグメント配信 — EC顧客を4象限で分類して売上を最大化", category: "顧客管理・CRM", description: "RFM分析を活用したLINEセグメント配信の設計方法。4象限に応じた最適なアプローチを解説。", brandName: "Lオペ for EC" });
}
