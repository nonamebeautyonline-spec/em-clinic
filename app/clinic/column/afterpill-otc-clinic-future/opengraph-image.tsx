import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "アフターピルOTC化の経緯と今後のクリニック処方の展望 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "アフターピルOTC化の経緯と\n今後のクリニック処方の展望",
    category: "活用事例",
    description: "緊急避妊薬のOTC化がクリニック経営に与える影響と対応戦略",
  });
}
