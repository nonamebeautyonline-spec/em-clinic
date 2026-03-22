import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "メディカルダイエットのオンライン診療ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "メディカルダイエットの\nオンライン診療ガイド",
    category: "活用事例",
    description: "GLP-1処方とLINEフォロー体制の構築",
  });
}
