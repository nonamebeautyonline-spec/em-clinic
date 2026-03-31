import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "食品ECのLINE再購入リマインド戦略 — 賞味期限ベースの自動配信設計", category: "業態別活用事例", description: "食品ECにおけるLINE活用事例。消費サイクルに基づく再購入リマインドの配信設計を解説。", brandName: "Lオペ for EC" });
}
