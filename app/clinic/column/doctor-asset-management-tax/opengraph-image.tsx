import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "開業医の資産運用と節税対策 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "開業医の資産運用と\n節税対策",
    category: "経営戦略",
    description: "所得分散・法人活用・退職金積立の基本",
  });
}
