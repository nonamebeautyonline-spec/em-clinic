import type { Metadata } from "next";
import ColumnIndex from "./_components/column-index";
import { articles } from "./articles";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "コラム | Lオペ for CLINIC — クリニック LINE活用・DX情報",
  description:
    "クリニックのLINE公式アカウント活用事例・DX導入ガイド・ツール比較など、クリニック経営に役立つ情報を発信。Lオペ for CLINIC公式コラム。",
  alternates: { canonical: `${SITE_URL}/lp/column` },
  openGraph: {
    title: "コラム | Lオペ for CLINIC",
    description: "クリニックのLINE活用・DX情報を発信するLオペ for CLINIC公式コラム。",
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
