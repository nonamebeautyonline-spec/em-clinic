import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックDX完全ガイド｜電子カルテ・予約・問診・決済のデジタル化手順";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニックDX完全ガイド｜電子カルテ・予約・問診・決済のデジタル化手順",
    category: "ガイド",
    description:
      "電子カルテ・予約システム・オンライン問診・オンライン診療・KPIダッシュボードの5領域を体系的に解説。クリニックDXの全体設計図として活用できる完全ガイド。",
  });
}
