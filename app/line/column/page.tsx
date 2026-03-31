import type { Metadata } from "next";
import ColumnIndex from "./_components/column-index";
import { articles } from "./articles";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "コラム | Lオペ — LINE公式アカウント運用情報",
  description:
    "Lオペ公式コラム。LINE公式アカウントの活用事例・ツール比較・配信設計・リッチメニュー・自動化など、LINE運用に役立つ情報を発信。",
  keywords: "Lオペ, Lオペ コラム, LINE公式アカウント 活用, LINE 配信, LINE 運用, セグメント配信, リッチメニュー 作り方, LINE チャットボット, LINE 拡張ツール 比較, Lステップ, エルメ, LINE 友だち集め, ブロック率 改善, LINE 自動応答, LINE予約システム",
  alternates: { canonical: `${SITE_URL}/line/column` },
  openGraph: {
    title: "コラム | Lオペ — LINE公式アカウント運用情報",
    description: "Lオペ公式コラム。LINE公式アカウントの運用に役立つ情報を発信。",
    url: `${SITE_URL}/line/column`,
  },
};

/* CollectionPage JSON-LD — コラム一覧の構造化データ */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Lオペ コラム",
  description: "LINE公式アカウントの活用事例・ツール比較・配信設計・リッチメニュー・自動化など、LINE運用に役立つ情報を発信。",
  url: `${SITE_URL}/line/column`,
  isPartOf: { "@type": "WebSite", name: "Lオペ", url: SITE_URL },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: articles.length,
    itemListElement: articles.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/line/column/${a.slug}`,
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
