import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "いびき外来・SASのオンライン診療ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "いびき外来・SASの\nオンライン診療ガイド",
    category: "活用事例",
    description: "検査からCPAP導入まで徹底解説",
  });
}
