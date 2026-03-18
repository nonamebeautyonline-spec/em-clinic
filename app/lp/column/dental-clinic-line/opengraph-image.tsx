import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "歯科クリニックのLINE活用 — 定期検診リマインドで通院率を向上";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "歯科クリニックのLINE活用 — 定期検診リマインドで通院率を向上",
    category: "活用事例",
    description:
      "歯科クリニックに特化したLINE公式アカウントの活用方法を解説。定期検診リマインド・治療計画の共有・予約管理など、歯科特有の課題をLINEで解決する方法を紹介。",
  });
}
