import type { Metadata } from "next";

const SITE_URL = "https://l-ope.jp";
const LP_URL = `${SITE_URL}/lp`;
const TITLE = "Lオペ for CLINIC | LINE公式アカウントでクリニック業務をDX化";
const DESCRIPTION =
  "Lオペ for CLINICは、LINE公式アカウントを活用したクリニック専用の業務DXプラットフォームです。患者CRM・予約管理・セグメント配信・リッチメニュー構築・オンライン問診・AI自動返信・決済・配送管理をオールインワンで提供。初期設定サポート無料・最短2週間で導入。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    "Lオペ, Lオペ for CLINIC, LINE公式アカウント クリニック, クリニック LINE, クリニック DX, 医療 LINE公式, 患者CRM, 予約管理システム, オンライン問診, AI自動返信, リッチメニュー, クリニック経営, LINE配信, 医療DX, クリニック 業務効率化",
  alternates: {
    canonical: LP_URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: LP_URL,
    siteName: "Lオペ for CLINIC",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

/* JSON-LD 構造化データ — Organization / SoftwareApplication / WebSite / BreadcrumbList */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lオペ for CLINIC",
    alternateName: ["Lオペ", "L-OPE for CLINIC", "L-OPE"],
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description:
      "Lオペ for CLINICは、LINE公式アカウントを活用したクリニック専用の業務DXプラットフォームです。",
    email: "info@l-ope.jp",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "info@l-ope.jp",
      availableLanguage: "Japanese",
    },
    sameAs: [],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Lオペ for CLINIC",
    alternateName: "Lオペ",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "LINE公式アカウント クリニック運用ツール",
    operatingSystem: "Web",
    description: DESCRIPTION,
    url: LP_URL,
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      url: LP_URL,
      description: "貴院の規模・運用体制に合わせた最適プランをご提案",
    },
    featureList:
      "患者CRM, セグメント配信, リッチメニュービルダー, オンライン問診, 予約管理, AI自動返信, 決済管理, 配送管理, ダッシュボード分析",
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Lオペ for CLINIC",
    alternateName: "Lオペ",
    serviceType: "LINE公式アカウント クリニック業務DXプラットフォーム",
    provider: {
      "@type": "Organization",
      name: "Lオペ for CLINIC",
      url: SITE_URL,
    },
    description: DESCRIPTION,
    url: LP_URL,
    areaServed: { "@type": "Country", name: "JP" },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: LP_URL,
      availableLanguage: "Japanese",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Lオペ for CLINIC",
    alternateName: "Lオペ",
    url: SITE_URL,
    description:
      "LINE公式アカウントでクリニック業務をDX化するプラットフォーム「Lオペ for CLINIC」",
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ホーム",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Lオペ for CLINIC",
        item: LP_URL,
      },
    ],
  },
  /* SiteNavigationElement — Googleサイトリンク表示を促進 */
  ...[
    { name: "Lオペとは", url: `${LP_URL}/about` },
    { name: "機能一覧", url: `${LP_URL}/features` },
    { name: "料金プラン", url: `${LP_URL}#pricing` },
    { name: "コラム", url: `${LP_URL}/column` },
    { name: "お問い合わせ", url: `${LP_URL}/contact` },
  ].map((item, i) => ({
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: item.name,
    url: item.url,
    position: i + 1,
  })),
];

export default function LPLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
