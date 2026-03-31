import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "整形外科のLINE活用 — リハビリ予約管理とフォローアップ自動化";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "整形外科のLINE活用 — リハビリ予約管理とフォローアップ自動化",
    category: "活用事例",
    description:
      "整形外科クリニックに特化したLINE公式アカウントの活用方法を解説。リハビリ予約の自動管理・通院リマインド・運動指導の配信など、整形外科特有の患者フォローをLINEで実現。",
  });
}
