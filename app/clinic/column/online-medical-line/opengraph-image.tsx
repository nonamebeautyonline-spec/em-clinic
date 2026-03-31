import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "オンライン診療×LINE — 患者体験を最大化する運用術";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "オンライン診療×LINE — 患者体験を最大化する運用術",
    category: "活用事例",
    description:
      "オンライン診療とLINE公式アカウントを組み合わせて患者体験を向上させる方法を解説。予約・問診・ビデオ通話・処方・決済までLINE起点で完結する運用術を紹介。",
  });
}
