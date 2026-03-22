import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";
export const runtime = "edge";
export const alt = "アフターピルのオンライン処方に必要な資格・研修・要件ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";
export default function OGImage() {
  return generateColumnOGP({ title: "アフターピル\nオンライン処方の\n資格・研修・要件", category: "ガイド", description: "緊急避妊薬を処方するための必須要件を網羅解説" });
}
