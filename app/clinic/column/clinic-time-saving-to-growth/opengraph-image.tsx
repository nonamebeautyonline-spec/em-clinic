import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "業務時間を削減して新規患者を獲得する — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "業務時間を削減して\n新規患者を獲得する",
    category: "マーケティング",
    description: "クリニックDXが生む成長サイクル",
  });
}
