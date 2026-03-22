import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "自費診療の価格設定ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "自費診療の\n価格設定ガイド",
    category: "マーケティング",
    description: "利益率と患者満足を両立する料金戦略",
  });
}
