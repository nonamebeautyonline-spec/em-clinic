import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "多院展開クリニックのLINE一元管理 — 複数拠点を効率的に運用する方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "多院展開クリニックのLINE一元管理 — 複数拠点を効率的に運用する方法",
    category: "活用事例",
    description:
      "複数拠点を持つクリニックグループのLINE公式アカウント運用方法を解説。拠点別の配信管理・統合ダッシュボード・スタッフ権限管理など、多院展開特有の課題をLINEで解決。",
  });
}
