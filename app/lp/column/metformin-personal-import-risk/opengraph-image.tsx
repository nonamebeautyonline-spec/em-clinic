import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "メトホルミンの個人輸入は危険？ — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "メトホルミンの\n個人輸入リスクと\n正しい入手方法",
    category: "医薬品解説",
    description: "偽造薬・品質管理・乳酸アシドーシスの危険性を解説",
  });
}
