import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "いびきのレーザー治療の実際のエビデンスとCPAPとの比較 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "いびきレーザー治療の\nエビデンスとCPAP比較",
    category: "エビデンス解説",
    description: "科学的根拠に基づくSAS治療の選び方",
  });
}
