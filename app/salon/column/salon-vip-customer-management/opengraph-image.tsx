import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのVIP顧客管理 — 上位20%の顧客を逃さないLINE活用術", category: "顧客管理・CRM", description: "サロンの売上の80%を生み出す上位20%のVIP顧客をLINEで管理・特別対応する方法を解説。", brandName: "Lオペ for SALON" });
}
