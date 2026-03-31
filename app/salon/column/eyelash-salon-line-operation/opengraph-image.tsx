import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "まつげサロンのLINE運用術 — リペア周期管理とリピート率向上の秘訣", category: "業態別活用事例", description: "まつげサロンがLINE公式アカウントを活用する方法を解説。リペア時期リマインドやデザインカタログの運用。", brandName: "Lオペ for SALON" });
}
