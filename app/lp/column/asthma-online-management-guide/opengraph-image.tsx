import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "喘息のオンライン継続管理 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "喘息のオンライン継続管理\n吸入薬処方・発作時対応",
    category: "活用事例",
    description: "モニタリング体制の構築を徹底解説",
  });
}
