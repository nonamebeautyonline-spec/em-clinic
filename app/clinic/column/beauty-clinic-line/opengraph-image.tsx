import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "美容クリニックのLINE活用術 — カウンセリング予約からアフターフォローまで";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "美容クリニックのLINE活用術 — カウンセリング予約からアフターフォローまで",
    category: "活用事例",
    description:
      "美容クリニックに特化したLINE公式アカウントの活用方法を解説。カウンセリング予約・施術リマインド・アフターフォロー・リピート促進まで、一連の患者体験をLINEで最適化。",
  });
}
