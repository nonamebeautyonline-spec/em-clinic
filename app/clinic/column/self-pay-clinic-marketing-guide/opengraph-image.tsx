import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "自費クリニック集患マーケティング完全ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "自費クリニック集患\nマーケティング完全ガイド",
    category: "マーケティング",
    description: "SEO・MEO・SNS・LINEで新患を増やす方法",
  });
}
