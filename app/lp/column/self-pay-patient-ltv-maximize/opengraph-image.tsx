import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "自費診療の患者LTV最大化ガイド — リピート処方と定期通院で安定経営を実現";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "自費診療の\n患者LTV最大化ガイド",
    category: "マーケティング",
    description: "リピート処方と定期通院で安定経営を実現",
  });
}
