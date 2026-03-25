import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "自費クリニックのLINE活用術 — 再診率を2倍にするセグメント配信とフォローアップ";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "自費クリニックのLINE活用術 — 再診率を2倍にするセグメント配信とフォローアップ",
    category: "活用事例",
    description:
      "セグメント配信・ステップ配信・リマインド配信を使った再診促進と治療ステージ別シナリオを紹介。",
  });
}
