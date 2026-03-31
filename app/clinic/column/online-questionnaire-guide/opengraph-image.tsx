import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのオンライン問診導入ガイド — 待ち時間短縮と業務効率化を両立";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニックのオンライン問診導入ガイド — 待ち時間短縮と業務効率化を両立",
    category: "ガイド",
    description:
      "クリニックにオンライン問診を導入する方法を解説。LINE上での問診実施により待ち時間を短縮し、紙の問診票では得られない詳細データの活用方法を紹介。",
  });
}
