import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "ヘルペス再発治療のオンライン診療 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "ヘルペス再発治療の\nオンライン診療",
    category: "活用事例",
    description: "PIT療法の導入と患者フォロー",
  });
}
