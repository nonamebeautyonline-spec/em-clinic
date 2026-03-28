import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Nav from "./lp/components/Nav";
import Hero from "./lp/components/Hero";
import Problems from "./lp/components/Problems";
import About from "./lp/components/About";

/* ATF（Above The Fold）以外は遅延読み込みで初期JS削減 */
const Features = dynamic(() => import("./lp/components/Features"));
const Strengths = dynamic(() => import("./lp/components/Strengths"));
const MidCTA = dynamic(() => import("./lp/components/MidCTA").then((m) => ({ default: m.MidCTA })));
const MobileCTA = dynamic(() => import("./lp/components/MobileCTA").then((m) => ({ default: m.MobileCTA })));
const UseCases = dynamic(() => import("./lp/components/UseCases"));
const Flow = dynamic(() => import("./lp/components/Flow").then((m) => ({ default: m.Flow })));
const Pricing = dynamic(() => import("./lp/components/Pricing").then((m) => ({ default: m.Pricing })));
const FAQ = dynamic(() => import("./lp/components/FAQ").then((m) => ({ default: m.FAQ })));
const FinalCTA = dynamic(() => import("./lp/components/FinalCTA").then((m) => ({ default: m.FinalCTA })));
const Footer = dynamic(() => import("./lp/components/Footer").then((m) => ({ default: m.Footer })));

const SITE_URL = "https://l-ope.jp";
const TITLE = "Lオペ | クリニック特化LINE運用プラットフォーム";
const DESCRIPTION =
  "Lオペ（Lオペ for CLINIC）は、LINE公式アカウントを活用したクリニック特化の業務DXプラットフォームです。Lオペなら患者CRM・予約管理・セグメント配信・リッチメニュー構築・オンライン問診・AI自動返信・決済・配送管理をオールインワンで提供。初期設定サポート無料・最短2週間で導入。";

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
    "Lオペ", "Lオペ for CLINIC", "L-OPE",
    "LINE公式アカウント クリニック", "クリニック LINE", "クリニック DX", "医療DX", "クリニック 業務効率化",
    "LINE公式アカウント 運用", "セグメント配信", "リッチメニュー", "AI自動返信", "LINE配信", "ステップ配信",
    "キーワード自動返信", "Flex Message", "チャットボット", "LINE 自動化", "LINE CRM",
    "患者CRM", "予約管理システム", "オンライン問診", "電子カルテ 連携", "カルテ管理", "配送管理",
    "クリニック 予約システム", "問診票 電子化", "SOAP カルテ", "音声カルテ",
    "クリニック 決済", "オンライン決済 医療", "Square 連携", "GMO決済", "在庫管理 クリニック",
    "処方薬 配送",
    "クリニック ダッシュボード", "売上分析", "患者LTV", "NPS調査", "LINE配信 分析", "クリック分析",
    "LINE公式 導入 費用", "クリニック 開業 LINE", "クリニック 集患",
    "Lステップ 比較", "Lステップ クリニック", "Liny 比較", "LINE配信ツール 比較", "クリニック LINE ツール",
    "美容クリニック LINE", "歯科 LINE", "皮膚科 LINE", "内科 LINE公式",
    "クリニック経営", "クリニック 集患 方法", "再診率 向上", "リピート率 向上", "無断キャンセル 防止",
    "クリニック 業務改善", "医療機関 LINE活用",
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

/* JSON-LD 構造化データ */
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
    url: SITE_URL,
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      url: SITE_URL,
      price: "0",
      priceCurrency: "JPY",
      description: "初期相談・資料請求は無料。貴院の規模・運用体制に合わせた最適プランをご提案",
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
    url: SITE_URL,
    areaServed: { "@type": "Country", name: "JP" },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: SITE_URL,
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
];

export default function HomePage() {
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
      <div className="min-h-screen overflow-x-hidden bg-white text-slate-800" style={{ fontFeatureSettings: "'palt'" }}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg">メインコンテンツへスキップ</a>
        <Nav />
        <main id="main-content">
          <Hero />
          <Problems />
          <About />
          <Features />
          <MidCTA title="これだけの機能をオールインワンで" sub="予約・問診・LINE配信・決済・配送管理まで、すべて込み。複数ツールの月額を大幅に削減できます。" />
          <Strengths />
          <MidCTA title="まずは無料で資料請求" sub="貴院の課題に合わせたデモのご案内も可能です。お気軽にお問い合わせください。" />
          <UseCases />
          <MidCTA title="貴院でも同じ効果を実現しませんか？" sub="導入クリニックの業務効率化事例をもとに、最適なプランをご提案します。" />
          <Flow />
          <Pricing />
          <FAQ />
          <FinalCTA />
        </main>
        <MobileCTA />
        <Footer />
      </div>
    </>
  );
}
