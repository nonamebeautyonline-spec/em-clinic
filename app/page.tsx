import type { Metadata } from "next";
import HomeClient from "./home-client";

const SITE_URL = "https://l-ope.jp";
const TITLE =
  "LINE公式アカウント運用ツール Lオペ | クリニック・サロン・ECに業種特化";
const DESCRIPTION =
  "LINE公式アカウントの運用を業種別に最適化するプラットフォーム「Lオペ」。クリニック・美容サロン・ECそれぞれの業務フローに合わせた専用機能を搭載。予約管理・顧客CRM・AI自動返信・セグメント配信・決済まで一元化。最短2週間で導入可能。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  keywords: [
    "LINE公式アカウント 運用",
    "LINE公式アカウント 運用ツール",
    "Lオペ",
    "LINE運用",
    "LINE公式アカウント",
    "クリニック LINE公式アカウント",
    "サロン LINE公式アカウント",
    "EC LINE運用",
    "LINE配信ツール",
    "LINE CRM",
    "業種特化",
    "LINE運用プラットフォーム",
    "LINE予約管理",
    "AI自動返信",
    "セグメント配信",
  ].join(", "),
  icons: {
    icon: [{ url: "/icon.png", sizes: "778x778", type: "image/png" }],
    apple: [{ url: "/icon.png", sizes: "778x778", type: "image/png" }],
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Lオペ",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "Lオペ — LINE公式アカウント運用を業種別に最適化するプラットフォーム",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

/* JSON-LD 構造化データ */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lオペ",
    alternateName: ["エルオペ", "L-OPE"],
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description:
      "LINE公式アカウントの運用を業種別に最適化するプラットフォーム。クリニック・サロン・ECに対応し、予約管理・顧客CRM・AI自動返信・セグメント配信・決済まで一元化。",
    email: "info@l-ope.jp",
    parentOrganization: {
      "@type": "Organization",
      name: "株式会社ORDIX",
      url: "https://ordix.co.jp",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "info@l-ope.jp",
      availableLanguage: "Japanese",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Lオペ",
    alternateName: "L-OPE",
    url: SITE_URL,
    description:
      "LINE公式アカウント運用を業種別に最適化するプラットフォーム「Lオペ」。クリニック・サロン・ECに対応。",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Lオペ",
    alternateName: "L-OPE",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY",
      description: "初期設定サポート無料・最短2週間で導入可能",
    },
    featureList: [
      "LINE公式アカウント運用",
      "予約管理",
      "顧客CRM",
      "セグメント配信",
      "AI自動返信",
      "オンライン決済",
      "配送管理",
      "オンライン診療",
      "問診",
      "監査ログ",
    ],
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
