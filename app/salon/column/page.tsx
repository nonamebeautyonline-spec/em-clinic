import type { Metadata } from "next";
import ColumnIndex from "./_components/column-index";
import { articles } from "./articles";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "コラム | Lオペ for SALON — サロンLINE運用情報",
  description:
    "Lオペ for SALON公式コラム。サロンのLINE公式アカウント活用事例・予約管理・配信設計・リッチメニュー・顧客管理など、サロンLINE運用に役立つ情報を発信。",
  keywords: "Lオペ for SALON コラム, サロン LINE活用, サロン LINE配信, 美容室 LINE, ネイルサロン LINE, エステ LINE, スタンプカード, リッチメニュー, 顧客管理",
  alternates: { canonical: `${SITE_URL}/salon/column` },
  openGraph: {
    title: "コラム | Lオペ for SALON — サロンLINE運用情報",
    description: "Lオペ for SALON公式コラム。サロンのLINE運用に役立つ情報を発信。",
    url: `${SITE_URL}/salon/column`,
  },
};

/* CollectionPage JSON-LD — コラム一覧の構造化データ */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Lオペ for SALON コラム",
  description: "サロンのLINE公式アカウント活用事例・予約管理・配信設計・リッチメニュー・顧客管理など、サロンLINE運用に役立つ情報を発信。",
  url: `${SITE_URL}/salon/column`,
  isPartOf: { "@type": "WebSite", name: "Lオペ for SALON", url: SITE_URL },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: articles.length,
    itemListElement: articles.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/salon/column/${a.slug}`,
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
