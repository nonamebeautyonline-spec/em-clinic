import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "多汗症のオンライン診療ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "多汗症のオンライン診療ガイド\nプロバンサイン・ラピフォートワイプの処方戦略",
    category: "活用事例",
    description: "薬剤選択から継続処方まで徹底解説",
  });
}
