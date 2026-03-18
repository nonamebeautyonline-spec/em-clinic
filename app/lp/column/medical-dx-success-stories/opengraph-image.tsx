import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "医療DXの成功事例5選 — LINE起点でクリニック経営を変革した方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "医療DXの成功事例5選 — LINE起点でクリニック経営を変革した方法",
    category: "活用事例",
    description:
      "LINE公式アカウントを起点に医療DXを成功させた5つのクリニック事例を紹介。予約数150%増・無断キャンセル80%減・スタッフ残業ゼロなど、具体的な成果を解説。",
  });
}
