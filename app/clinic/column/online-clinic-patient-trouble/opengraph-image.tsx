import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";
export const runtime = "edge";
export const alt = "オンライン診療の患者トラブル対応マニュアル — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";
export default function OGImage() {
  return generateColumnOGP({ title: "オンライン診療の\n患者トラブル対応マニュアル", category: "運営ノウハウ", description: "クレーム・返金・副作用報告の実務" });
}
