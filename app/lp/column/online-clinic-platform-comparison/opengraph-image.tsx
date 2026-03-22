import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "オンライン診療プラットフォーム比較 — CLINICS・curon・Lオペの機能・費用・特徴を徹底比較";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "オンライン診療\nプラットフォーム比較",
    category: "ツール比較",
    description:
      "CLINICS・curon・Lオペの機能・費用・特徴を徹底比較",
  });
}
