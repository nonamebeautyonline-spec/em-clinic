import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "アフターピルのオンライン処方ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "アフターピルの\nオンライン処方ガイド",
    category: "活用事例",
    description: "OTC時代のクリニック差別化戦略を徹底解説",
  });
}
