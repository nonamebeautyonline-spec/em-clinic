import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "不眠症・睡眠薬オンライン処方の勝ち方 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "不眠症・睡眠薬\nオンライン処方の勝ち方",
    category: "ガイド",
    description: "安全管理と継続フォロー戦略",
  });
}
