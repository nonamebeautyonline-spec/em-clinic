import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "マンジャロと血糖値・併用薬 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "マンジャロと血糖値・併用薬\nメトホルミン・健診・精神科薬",
    category: "医薬品解説",
    description: "インスリン枯渇の誤解・メトホルミン併用・健康診断への影響",
  });
}
