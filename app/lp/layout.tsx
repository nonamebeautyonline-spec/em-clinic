import type { Metadata } from "next";

const SITE_URL = "https://l-ope.jp";
const LP_URL = `${SITE_URL}/lp`;
const TITLE = "Lオペ for CLINIC | クリニック特化LINE運用プラットフォーム";
const DESCRIPTION =
  "LINE公式アカウントを活用したクリニック業務のDX化。患者CRM・予約管理・セグメント配信・リッチメニュー構築・オンライン問診・AI自動返信・決済・配送管理をオールインワンで提供。初期設定サポート無料・最短2週間で導入。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    "クリニック LINE, クリニック DX, 医療 LINE公式, 患者CRM, 予約管理システム, オンライン問診, AI自動返信, リッチメニュー, クリニック経営, LINE配信, 医療DX, クリニック 業務効率化",
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
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Lオペ for CLINIC — クリニック特化LINE運用プラットフォーム",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
  },
};

/* JSON-LD 構造化データ — Organization / SoftwareApplication / WebSite / BreadcrumbList */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lオペ for CLINIC",
    url: SITE_URL,
    logo: `${SITE_URL}/images/l-ope-logo.png`,
    description: "クリニック特化LINE運用プラットフォーム",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      availableLanguage: "Japanese",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Lオペ for CLINIC",
    applicationCategory: "BusinessApplication",
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
    "@type": "WebSite",
    name: "Lオペ for CLINIC",
    url: SITE_URL,
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
