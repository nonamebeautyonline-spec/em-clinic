import type { Metadata } from "next";
import ColumnIndex from "./_components/column-index";
import { articles } from "./articles";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ コラム | クリニックLINE活用・DX情報 - Lオペ for CLINIC",
  description:
    "Lオペ公式コラム。クリニックのLINE公式アカウント活用事例・DX導入ガイド・ツール比較など、クリニック経営に役立つ情報を発信。",
  keywords: "Lオペ, Lオペ コラム, Lオペ for CLINIC, クリニック LINE 活用事例, クリニック DX ガイド, LINE公式アカウント 活用, クリニック 予約システム 比較, クリニック 経営, 美容クリニック LINE, 歯科 LINE 活用, 皮膚科 LINE, オンライン診療 LINE, クリニック 集患, リピート率 向上, ブロック率 下げる, リッチメニュー 設計, AI自動返信 導入, クリニック KPI",
  alternates: { canonical: `${SITE_URL}/lp/column` },
  openGraph: {
    title: "Lオペ コラム | クリニックLINE活用・DX情報 - Lオペ for CLINIC",
    description: "Lオペ公式コラム。クリニックのLINE活用・DX情報を発信。",
    url: `${SITE_URL}/lp/column`,
  },
};

/* CollectionPage JSON-LD — コラム一覧の構造化データ */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Lオペ for CLINIC コラム",
  description: "クリニックのLINE公式アカウント活用事例・DX導入ガイド・ツール比較など、クリニック経営に役立つ情報を発信。",
  url: `${SITE_URL}/lp/column`,
  isPartOf: { "@type": "WebSite", name: "Lオペ for CLINIC", url: SITE_URL },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: articles.length,
    itemListElement: articles.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/lp/column/${a.slug}`,
      name: a.title,
    })),
  },
};

export default function ColumnIndexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ColumnIndex />
    </>
  );
}
