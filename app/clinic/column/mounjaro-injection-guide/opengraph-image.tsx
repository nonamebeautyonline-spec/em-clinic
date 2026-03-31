import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "マンジャロの正しい打ち方ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "マンジャロの正しい打ち方\n注射部位・投与間隔・対処法",
    category: "医薬品解説",
    description: "アテオスの使い方・痛み軽減・液漏れ対処まで",
  });
}
