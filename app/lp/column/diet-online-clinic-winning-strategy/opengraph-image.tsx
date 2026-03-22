import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "GLP-1ダイエット・メディカルダイエットオンラインクリニックの勝ち方 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "メディカルダイエット\nオンラインクリニックの勝ち方",
    category: "経営戦略",
    description: "GLP-1処方で月商500万円を実現するロードマップ",
  });
}
