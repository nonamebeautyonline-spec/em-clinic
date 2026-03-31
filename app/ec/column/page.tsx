import type { Metadata } from "next";
import ColumnIndex from "./_components/column-index";
import { articles } from "./articles";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "コラム | Lオペ for EC — EC向けLINE運用情報",
  description:
    "Lオペ for EC公式コラム。ECサイトのLINE活用事例・カゴ落ち対策・セグメント配信・CRM・発送管理など、EC向けLINE運用に役立つ情報を発信。",
  keywords: "Lオペ for EC コラム, EC LINE活用, カゴ落ち対策, セグメント配信 EC, EC CRM LINE, 発送通知 LINE, リピート率 LINE, D2C LINE",
  alternates: { canonical: `${SITE_URL}/ec/column` },
  openGraph: {
    title: "コラム | Lオペ for EC — EC向けLINE運用情報",
    description: "Lオペ for EC公式コラム。EC向けLINE運用に役立つ情報を発信。",
    url: `${SITE_URL}/ec/column`,
  },
};

/* CollectionPage JSON-LD — コラム一覧の構造化データ */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Lオペ for EC コラム",
  description: "ECサイトのLINE活用事例・カゴ落ち対策・セグメント配信・CRM・発送管理など、EC向けLINE運用に役立つ情報を発信。",
  url: `${SITE_URL}/ec/column`,
  isPartOf: { "@type": "WebSite", name: "Lオペ for EC", url: SITE_URL },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: articles.length,
    itemListElement: articles.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/ec/column/${a.slug}`,
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
