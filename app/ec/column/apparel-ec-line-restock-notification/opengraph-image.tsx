import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "アパレルECのLINE活用術 — 再入荷通知・コーディネート提案で売上UP", category: "業態別活用事例", description: "アパレルECにおけるLINE活用の具体例。再入荷通知やコーディネート提案で売上に直結する施策。", brandName: "Lオペ for EC" });
}
