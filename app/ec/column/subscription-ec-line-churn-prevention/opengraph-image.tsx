import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サブスクECのLINE活用 — 解約防止と継続率を高める5つの施策", category: "業態別活用事例", description: "サブスクECの解約防止にLINEを活用する5つの施策。解約予兆スコアリングから継続特典通知まで。", brandName: "Lオペ for EC" });
}
