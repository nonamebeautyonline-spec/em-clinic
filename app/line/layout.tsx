import type { Metadata } from "next";

const SITE_URL = "https://l-ope.jp";
const LINE_URL = `${SITE_URL}/line`;
const TITLE = "Lオペ for LINE | LINE公式アカウント運用プラットフォーム";
const DESCRIPTION =
  "LINE公式アカウントの配信・セグメント・リッチメニュー・予約・フォーム・分析をオールインワンで管理できるプラットフォーム。飲食・美容・EC・不動産・教育・士業など、あらゆる業種のLINE運用を効率化。";

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
    "Lオペ for LINE", "Lオペ", "L-OPE",
    /* ピラー */
    "LINEマーケティングツール", "LINE公式アカウント", "LINE運用", "LINE拡張ツール",
    /* 配信 */
    "セグメント配信", "シナリオ配信", "ステップ配信", "LINE配信", "LINE自動化",
    /* 機能 */
    "リッチメニュー", "LINE予約", "LINEフォーム", "LINE分析", "チャットボット", "LINE CRM",
    /* 競合 */
    "Lステップ 比較", "エルメ 比較", "Liny 比較", "LINE配信ツール 比較",
    /* 業種 */
    "飲食店 LINE", "美容サロン LINE", "EC LINE", "不動産 LINE", "教育 LINE", "士業 LINE",
  ].join(", "),
  icons: {
    icon: [{ url: "/icon.png", sizes: "778x778", type: "image/png" }],
    apple: [{ url: "/icon.png", sizes: "778x778", type: "image/png" }],
  },
  alternates: {
    canonical: LINE_URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: LINE_URL,
    siteName: "Lオペ for LINE",
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
    name: "Lオペ for LINE",
    alternateName: ["エルオペ for LINE", "L-OPE for LINE"],
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description:
      "Lオペ for LINEは、LINE公式アカウントの運用を効率化するオールインワンプラットフォームです。",
    email: "info@l-ope.jp",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "info@l-ope.jp",
      availableLanguage: "Japanese",
    },
    knowsAbout: [
      "LINE公式アカウント運用全般",
      "セグメント配信",
      "シナリオ配信",
      "リッチメニュー構築",
      "予約管理",
      "フォーム作成",
      "分析ダッシュボード",
    ],
  },
  /* SoftwareApplication */
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Lオペ for LINE",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "LINE公式アカウント拡張ツール",
    operatingSystem: "Web",
    description: DESCRIPTION,
    url: LINE_URL,
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "32780",
      priceCurrency: "JPY",
      offerCount: 3,
      description: "フリープラン（月額0円）からプロプラン（月額32,780円）まで",
    },
    featureList:
      "セグメント配信, シナリオ配信, リッチメニュー管理, 予約管理, フォーム作成, 分析ダッシュボード, チャットボット, LINE CRM",
  },
  /* Service */
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Lオペ for LINE",
    serviceType: "LINE公式アカウント運用プラットフォーム",
    provider: {
      "@type": "Organization",
      name: "Lオペ for LINE",
      url: SITE_URL,
    },
    description: DESCRIPTION,
    url: LINE_URL,
    areaServed: { "@type": "Country", name: "JP" },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: LINE_URL,
      availableLanguage: "Japanese",
    },
  },
  /* WebSite */
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Lオペ for LINE",
    url: SITE_URL,
    description:
      "LINE公式アカウント運用をオールインワンで効率化するプラットフォーム「Lオペ for LINE」",
  },
  /* SiteNavigationElement */
  ...[
    { name: "Lオペ for LINEとは", url: `${LINE_URL}/about` },
    { name: "機能一覧", url: `${LINE_URL}/features` },
    { name: "料金プラン", url: `${LINE_URL}#pricing` },
    { name: "コラム", url: `${LINE_URL}/column` },
    { name: "お問い合わせ", url: `${LINE_URL}/contact` },
  ].map((item, i) => ({
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: item.name,
    url: item.url,
    position: i + 1,
  })),
];

export default function LineLayout({ children }: { children: React.ReactNode }) {
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
