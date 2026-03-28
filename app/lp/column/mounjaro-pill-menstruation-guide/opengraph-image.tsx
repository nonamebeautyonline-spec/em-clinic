import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "マンジャロとピル・月経 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "マンジャロとピル・月経\n併用の注意点と妊娠への影響",
    category: "医薬品解説",
    description: "避妊効果の低下リスク・月経不順のメカニズム・妊娠希望者のルール",
  });
}
