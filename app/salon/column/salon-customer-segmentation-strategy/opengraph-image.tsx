import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンの顧客セグメント設計 — 来店回数・メニュー・頻度で分類する方法", category: "顧客管理・CRM", description: "サロンの顧客を来店回数・施術メニュー・来店頻度・担当スタッフで効果的にセグメントする方法を解説。", brandName: "Lオペ for SALON" });
}
