import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "クリニックの広告と薬機法ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの広告と\n薬機法ガイド",
    category: "ガイド",
    description: "違反しない表現ガイドと医療広告ガイドライン対応",
  });
}
