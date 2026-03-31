import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの予約枠最適化 — LINEデータ分析で稼働率を向上させる方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの予約枠最適化 — LINEデータ分析で稼働率を向上させる方法",
    category: "業務改善",
    description:
      "予約データの分析から最適な枠数・時間帯設定・キャンセル待ち管理まで、データドリブンな予約運用を紹介。",
  });
}
