import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのLINE友だち集め10の施策 — 店頭・SNS・ホットペッパーを活用", category: "サロンLINE活用入門", description: "サロンがLINE公式アカウントの友だち数を効率的に増やすための10の施策を紹介。", brandName: "Lオペ for SALON" });
}
