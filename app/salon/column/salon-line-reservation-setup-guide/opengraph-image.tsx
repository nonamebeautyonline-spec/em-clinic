import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのLINE予約設定ガイド — 予約受付から自動リマインドまで完全解説", category: "予約管理・ホットペッパー連携", description: "サロンにLINE予約を導入する方法を完全解説。メニュー設定、スタッフシフト連携、自動リマインド配信まで。", brandName: "Lオペ for SALON" });
}
