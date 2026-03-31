import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "小児科クリニックのLINE活用術 — 予防接種リマインドと成長記録の共有";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "小児科クリニックのLINE活用術 — 予防接種リマインドと成長記録の共有",
    category: "活用事例",
    description:
      "小児科クリニックに特化したLINE公式アカウントの活用方法を解説。予防接種スケジュール管理・成長記録の共有・保護者への自動フォローなど、小児科特有の業務をLINEで効率化。",
  });
}
