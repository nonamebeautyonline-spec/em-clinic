import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({
    title: "LINE公式アカウントの作り方2026年最新版 — 開設から初期設定まで完全ガイド",
    category: "LINE公式アカウント入門",
    description: "LINE公式アカウントの開設手順を2026年最新の管理画面に対応して解説。アカウント種別の選び方、プロフィール設定、認証済みアカウントの申請方法まで、初心者でも迷わない完全ガイドです。",
    brandName: "Lオペ for LINE",
  });
}
