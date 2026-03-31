import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニック経営で成功するポイント — 倒産急増時代に生き残る戦略";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニック経営で成功するポイント — 倒産急増時代に生き残る戦略",
    category: "ガイド",
    description:
      "2024年の医療機関倒産件数は過去最多の64件。クリニック経営に必要な3つの業務と成功するクリニックの共通点、失敗要因を徹底解説。LINE活用による経営改善策も紹介。",
  });
}
