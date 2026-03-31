import { generateColumnOGP } from "../_components/ogp-helper";
import { articles } from "../articles";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "クリニック向けLINEツール5社比較";

const self = articles.find((a) => a.slug === "clinic-line-tool-5-comparison")!;

export default function Image() {
  return generateColumnOGP({ title: self.title, category: self.category, description: self.description });
}
