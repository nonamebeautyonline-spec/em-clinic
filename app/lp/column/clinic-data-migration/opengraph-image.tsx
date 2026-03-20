import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのデータ移行ガイド — 既存システムからの安全な乗り換え方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのデータ移行ガイド — 既存システムからの安全な乗り換え方法",
    category: "ガイド",
    description:
      "患者データの安全な移行手順・注意点・移行後の検証方法まで、システム切り替え時のリスクを最小化する方法を紹介。",
  });
}
