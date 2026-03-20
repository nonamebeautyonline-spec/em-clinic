import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのオンライン決済導入ガイド — LINE連携で会計業務を効率化";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのオンライン決済導入ガイド — LINE連携で会計業務を効率化",
    category: "ガイド",
    description:
      "クリニックにオンライン決済を導入する方法を解説。LINE上での決済完結・Square/GMO連携・銀行振込の自動消込など、会計業務を大幅に効率化する方法を紹介。",
  });
}
