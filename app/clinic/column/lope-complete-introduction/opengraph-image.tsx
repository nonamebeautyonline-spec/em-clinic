import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "Lオペ for CLINIC完全ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "Lオペ for CLINIC\n完全ガイド",
    category: "ガイド",
    description: "機能・料金・導入事例をまるごと解説",
  });
}
