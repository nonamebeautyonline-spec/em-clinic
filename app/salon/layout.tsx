import type { Metadata } from "next";

const SITE_URL = "https://l-ope.jp";
const SALON_URL = `${SITE_URL}/salon`;
const TITLE = "Lオペ for SALON | サロン特化LINE運用プラットフォーム";
const DESCRIPTION =
  "美容室・ネイル・エステ・まつげ・脱毛サロンのLINE公式アカウント運用を効率化。予約管理・顧客管理・セグメント配信・リッチメニュー・スタンプカード・物販まで、サロン経営に必要な機能をオールインワンで提供。";

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
    "Lオペ for SALON", "Lオペ サロン", "L-OPE SALON",
    /* ピラー */
    "サロン LINE", "美容室 LINE", "サロン LINE運用", "サロン LINE公式アカウント",
    /* 機能 */
    "サロン 予約管理", "ホットペッパー LINE連携", "サロン 顧客管理", "サロン CRM",
    "サロン セグメント配信", "サロン リッチメニュー", "サロン スタンプカード", "サロン 物販",
    /* 業態 */
    "美容室 LINE運用", "ネイルサロン LINE", "エステサロン LINE", "まつげサロン LINE", "脱毛サロン LINE",
    /* 競合 */
    "リピッテ 比較", "ミニモ 比較", "サロン LINE配信ツール 比較",
  ].join(", "),
  icons: {
    icon: [{ url: "/icon.png", sizes: "778x778", type: "image/png" }],
    apple: [{ url: "/icon.png", sizes: "778x778", type: "image/png" }],
  },
  alternates: {
    canonical: SALON_URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SALON_URL,
    siteName: "Lオペ for SALON",
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
    name: "Lオペ for SALON",
    alternateName: ["エルオペ サロン", "L-OPE SALON"],
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description:
      "Lオペ for SALONは、美容室・ネイル・エステ等のサロン向けLINE公式アカウント運用プラットフォームです。",
    email: "info@l-ope.jp",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "info@l-ope.jp",
      availableLanguage: "Japanese",
    },
    knowsAbout: [
      "サロンLINE運用",
      "予約管理・ホットペッパー連携",
      "顧客管理・来店履歴",
      "セグメント配信",
      "リッチメニュー構築",
      "スタンプカード・ポイント管理",
      "物販・EC機能",
    ],
  },
  /* SoftwareApplication */
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Lオペ for SALON",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "サロン向けLINE公式アカウント拡張ツール",
    operatingSystem: "Web",
    description: DESCRIPTION,
    url: SALON_URL,
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "9800",
      highPrice: "39800",
      priceCurrency: "JPY",
      offerCount: 3,
      description: "ライトプラン（月額9,800円）からプレミアムプラン（月額39,800円）まで",
    },
    featureList:
      "予約管理, ホットペッパー連携, 顧客管理, 来店履歴, セグメント配信, リッチメニュー管理, スタンプカード, 物販・EC機能",
  },
  /* Service */
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Lオペ for SALON",
    serviceType: "サロン向けLINE公式アカウント運用プラットフォーム",
    provider: {
      "@type": "Organization",
      name: "Lオペ",
      url: SITE_URL,
    },
    description: DESCRIPTION,
    url: SALON_URL,
    areaServed: { "@type": "Country", name: "JP" },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: SALON_URL,
      availableLanguage: "Japanese",
    },
  },
  /* WebSite */
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Lオペ for SALON",
    url: SITE_URL,
    description:
      "サロンのLINE公式アカウント運用をオールインワンで効率化するプラットフォーム「Lオペ for SALON」",
  },
  /* SiteNavigationElement */
  ...[
    { name: "Lオペ for SALONとは", url: `${SALON_URL}/about` },
    { name: "機能一覧", url: `${SALON_URL}/features` },
    { name: "料金プラン", url: `${SALON_URL}#pricing` },
    { name: "コラム", url: `${SALON_URL}/column` },
    { name: "お問い合わせ", url: `${SALON_URL}/contact` },
  ].map((item, i) => ({
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: item.name,
    url: item.url,
    position: i + 1,
  })),
];

export default function SalonLayout({ children }: { children: React.ReactNode }) {
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
