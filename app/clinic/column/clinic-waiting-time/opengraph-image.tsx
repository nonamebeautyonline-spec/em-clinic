import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの待ち時間対策 — LINE通知で患者ストレスを軽減する方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの待ち時間対策 — LINE通知で患者ストレスを軽減する方法",
    category: "業務改善",
    description:
      "クリニックの待ち時間問題をLINE通知で解決する方法を解説。順番通知・混雑状況の可視化・時間帯別予約の最適化など、患者と医院双方のストレスを軽減する具体策を紹介。",
  });
}
