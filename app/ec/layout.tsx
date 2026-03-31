import type { Metadata } from "next";

const SITE_URL = "https://l-ope.jp";
const EC_URL = `${SITE_URL}/ec`;
const TITLE = "Lオペ for EC | EC・小売向けLINE運用プラットフォーム";
const DESCRIPTION =
  "EC・小売・D2CブランドのLINE公式アカウント運用を効率化するプラットフォーム。カゴ落ち対策・発送通知・CRM・セグメント配信・クーポン管理をオールインワンで提供。";

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
    /* ブランド */
    "Lオペ for EC", "Lオペ EC", "L-OPE EC",
    /* ピラー */
    "EC LINE運用", "EC LINE公式アカウント", "EC LINE配信", "EC LINEマーケティング",
    /* 機能 */
    "カゴ落ち対策 LINE", "発送通知 LINE", "EC CRM LINE", "セグメント配信 EC",
    "クーポン配信 LINE", "リピート促進 LINE", "購買履歴 配信",
    /* 業種 */
    "D2C LINE", "アパレルEC LINE", "食品EC LINE", "サブスクEC LINE", "小売 LINE",
    /* 競合 */
    "EC LINE拡張ツール 比較", "ECサイト LINE連携",
  ].join(", "),
  icons: {
    icon: [{ url: "/icon.png", sizes: "778x778", type: "image/png" }],
    apple: [{ url: "/icon.png", sizes: "778x778", type: "image/png" }],
  },
  alternates: {
    canonical: EC_URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: EC_URL,
    siteName: "Lオペ for EC",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

/* JSON-LD 構造化データ */
const jsonLd = [
  /* Organization */
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lオペ for EC",
    alternateName: ["エルオペ for EC", "L-OPE for EC"],
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description:
      "Lオペ for ECは、ECサイト・小売・D2CブランドのLINE公式アカウント運用を効率化するプラットフォームです。",
    email: "info@l-ope.jp",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "info@l-ope.jp",
      availableLanguage: "Japanese",
    },
    knowsAbout: [
      "EC向けLINE公式アカウント運用",
      "カゴ落ち対策",
      "発送通知自動化",
      "顧客CRM",
      "セグメント配信",
      "クーポン管理",
    ],
  },
  /* SoftwareApplication */
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Lオペ for EC",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "EC向けLINE運用プラットフォーム",
    operatingSystem: "Web",
    description: DESCRIPTION,
    url: EC_URL,
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "9800",
      highPrice: "49800",
      priceCurrency: "JPY",
      offerCount: 3,
      description: "スタートプラン（月額9,800円）からエンタープライズプラン（月額49,800円）まで",
    },
    featureList:
      "カゴ落ち対策, 発送管理, 配送ステータス通知, 顧客CRM, セグメント配信, クーポン管理, 購買履歴分析, リッチメニュー管理",
  },
  /* Service */
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Lオペ for EC",
    serviceType: "EC向けLINE運用プラットフォーム",
    provider: {
      "@type": "Organization",
      name: "Lオペ",
      url: SITE_URL,
    },
    description: DESCRIPTION,
    url: EC_URL,
    areaServed: { "@type": "Country", name: "JP" },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: EC_URL,
      availableLanguage: "Japanese",
    },
  },
  /* WebSite */
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Lオペ for EC",
    url: SITE_URL,
    description:
      "EC・小売向けLINE公式アカウント運用をオールインワンで効率化するプラットフォーム「Lオペ for EC」",
  },
  /* SiteNavigationElement */
  ...[
    { name: "Lオペ for ECとは", url: `${EC_URL}/about` },
    { name: "機能一覧", url: `${EC_URL}/features` },
    { name: "料金プラン", url: `${EC_URL}#pricing` },
    { name: "コラム", url: `${EC_URL}/column` },
    { name: "お問い合わせ", url: `${EC_URL}/contact` },
  ].map((item, i) => ({
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: item.name,
    url: item.url,
    position: i + 1,
  })),
];

export default function EcLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
