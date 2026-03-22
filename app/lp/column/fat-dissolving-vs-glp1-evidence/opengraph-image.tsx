import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "脂肪溶解注射のエビデンスとGLP-1との比較 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "脂肪溶解注射のエビデンスと\nGLP-1との比較",
    category: "エビデンス解説",
    description: "科学的根拠に基づくメディカルダイエットの選び方",
  });
}
