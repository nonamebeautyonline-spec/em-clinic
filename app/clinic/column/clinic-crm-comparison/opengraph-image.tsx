import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニック向けCRM比較6選 — 患者管理を効率化するツールの選び方";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニック向けCRM比較6選 — 患者管理を効率化するツールの選び方",
    category: "比較",
    description:
      "病院・クリニック向けCRMを6製品厳選比較。多機能型から地域医療連携特化型まで、選定基準・導入メリット・LINE連携の重要性を解説。",
  });
}
