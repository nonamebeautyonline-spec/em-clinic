import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのLINE公式アカウント開設ガイド — 登録から初期設定まで完全解説", category: "サロンLINE活用入門", description: "美容室・ネイル・エステなどサロン向けに、LINE公式アカウントの開設手順を2026年最新の管理画面に対応して解説。", brandName: "Lオペ for SALON" });
}
