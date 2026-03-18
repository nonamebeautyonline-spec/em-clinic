import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのLINE友だち集め — 月100人増やす7つの施策";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのLINE友だち集め — 月100人増やす7つの施策",
    category: "マーケティング",
    description:
      "クリニックのLINE公式アカウントの友だち数を効率的に増やす7つの施策を紹介。院内掲示・Web導線・初回特典など、すぐに実践できる集客テクニックを解説。",
  });
}
