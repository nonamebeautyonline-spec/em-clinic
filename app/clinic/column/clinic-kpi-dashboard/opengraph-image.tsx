import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニック経営の数値管理 — LINEダッシュボードで見るべきKPI7選";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニック経営の数値管理 — LINEダッシュボードで見るべきKPI7選",
    category: "ガイド",
    description:
      "クリニック経営に必要な7つのKPIとその管理方法を解説。LINE公式アカウントのダッシュボードを活用して、予約数・リピート率・LTVなどをリアルタイムで把握する方法を紹介。",
  });
}
