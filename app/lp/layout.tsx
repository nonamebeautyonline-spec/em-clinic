import type { Metadata } from "next";

const SITE_URL = "https://l-ope.jp";
const LP_URL = `${SITE_URL}/lp`;
const TITLE = "Lオペ | クリニック特化LINE運用プラットフォーム - Lオペ for CLINIC";
const DESCRIPTION =
  "Lオペは、LINE公式アカウントを活用したクリニック特化の業務DXプラットフォームです。Lオペなら患者CRM・予約管理・セグメント配信・リッチメニュー構築・オンライン問診・AI自動返信・決済・配送管理をオールインワンで提供。初期設定サポート無料・最短2週間で導入。";

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
    "Lオペ", "Lオペ for CLINIC", "L-OPE",
    /* ピラー */
    "LINE公式アカウント クリニック", "クリニック LINE", "クリニック DX", "医療DX", "クリニック 業務効率化",
    /* LINE運用 */
    "LINE公式アカウント 運用", "セグメント配信", "リッチメニュー", "AI自動返信", "LINE配信", "ステップ配信",
    "キーワード自動返信", "Flex Message", "チャットボット", "LINE 自動化", "LINE CRM",
    /* 業務管理 */
    "患者CRM", "予約管理システム", "オンライン問診", "電子カルテ 連携", "カルテ管理", "配送管理",
    "クリニック 予約システム", "問診票 電子化", "SOAP カルテ", "音声カルテ",
    /* 決済・在庫 */
    "クリニック 決済", "オンライン決済 医療", "Square 連携", "GMO決済", "在庫管理 クリニック",
    "処方薬 配送",
    /* 分析 */
    "クリニック ダッシュボード", "売上分析", "患者LTV", "NPS調査", "LINE配信 分析", "クリック分析",
    /* 導入検討 */
    "LINE公式 導入 費用", "クリニック 開業 LINE", "クリニック 集患",
    /* 競合比較 */
    "Lステップ 比較", "Lステップ クリニック", "Liny 比較", "LINE配信ツール 比較", "クリニック LINE ツール",
    /* 診療科別 */
    "美容クリニック LINE", "歯科 LINE", "皮膚科 LINE", "内科 LINE公式",
    /* 経営 */
    "クリニック経営", "クリニック 集患 方法", "再診率 向上", "リピート率 向上", "無断キャンセル 防止",
    "クリニック 業務改善", "医療機関 LINE活用",
  ].join(", "),
  icons: {
    icon: [{ url: "/icon.png", sizes: "778x778", type: "image/png" }],
    apple: [{ url: "/icon.png", sizes: "778x778", type: "image/png" }],
  },
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
    images: [{ url: `${SITE_URL}/lp/opengraph-image`, width: 1200, height: 630, alt: "Lオペ for CLINIC — LINE公式アカウントでクリニック業務をDX化" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/lp/opengraph-image`],
  },
};

/* JSON-LD 構造化データ — Organization / SoftwareApplication / WebSite / BreadcrumbList */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lオペ for CLINIC",
    alternateName: ["Lオペ", "エルオペ", "L-OPE for CLINIC", "L-OPE"],
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
    knowsAbout: [
      "LINE公式アカウント運用",
      "クリニックDX",
      "患者CRM",
      "医療業務効率化",
      "オンライン問診",
      "セグメント配信",
      "AI自動返信",
      "電子カルテ連携",
    ],
    sameAs: ["https://l-ope.jp/lp/about"],
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
