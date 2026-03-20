import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "内科クリニックのLINE活用 — 慢性疾患の定期通院管理と服薬フォロー";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "内科クリニックのLINE活用 — 慢性疾患の定期通院管理と服薬フォロー",
    category: "活用事例",
    description:
      "内科クリニックに特化したLINE公式アカウントの活用方法を解説。慢性疾患の定期通院リマインド・服薬フォロー・検査結果の共有など、内科特有の継続的な患者管理をLINEで効率化。",
  });
}
