import type { Metadata } from "next";

const SITE_URL = "https://l-ope.jp";
const LP_URL = `${SITE_URL}/clinic`;
const TITLE =
  "【医療特化45機能】クリニックのLINE公式アカウント運用ならLオペ | 予約・問診・オンライン診療を一元化";
const DESCRIPTION =
  "クリニック向けLINE公式アカウント運用プラットフォーム「Lオペ」。予約管理・問診・オンライン診療・AI自動返信・決済・配送まで45機能をLINEで一元化。最短2週間で導入、初期設定サポート無料。";

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
    /* メインキーワード（検索1位狙い） */
    "クリニック LINE公式アカウント 運用", "クリニック LINE運用", "クリニック LINE 導入",
    "オンライン診療 LINE", "オンライン診療 LINE連携", "オンライン診療 プラットフォーム",
    "医療 LINE公式アカウント", "医療機関 LINE公式アカウント 活用",
    "病院 LINE公式アカウント", "クリニック LINE 活用",
    /* ブランド */
    "Lオペ", "Lオペ for CLINIC", "L-OPE",
    /* ピラー */
    "LINE公式アカウント クリニック", "クリニック LINE", "クリニック DX", "医療DX", "クリニック 業務効率化",
    /* LINE運用 */
    "LINE公式アカウント 運用", "セグメント配信", "リッチメニュー", "AI自動返信", "LINE配信", "ステップ配信",
    "キーワード自動返信", "Flex Message", "チャットボット", "LINE 自動化", "LINE CRM",
    /* 業務管理 */
    "患者CRM", "予約管理システム", "オンライン問診", "オンライン診療 システム", "電子カルテ 連携", "カルテ管理", "配送管理",
    "クリニック 予約システム", "問診票 電子化", "SOAP カルテ", "音声カルテ",
    /* 決済・在庫 */
    "クリニック 決済", "オンライン決済 医療", "Square 連携", "GMO決済", "在庫管理 クリニック",
    "処方薬 配送",
    /* 分析 */
    "クリニック ダッシュボード", "売上分析", "患者LTV", "NPS調査", "LINE配信 分析", "クリック分析",
    /* 導入検討 */
    "LINE公式 導入 費用", "クリニック 開業 LINE", "クリニック 集患", "クリニック 集患 LINE",
    /* 競合比較 */
    "Lステップ 比較", "Lステップ クリニック", "Liny 比較", "LINE配信ツール 比較", "クリニック LINE ツール 比較",
    /* 診療科別 */
    "美容クリニック LINE", "歯科 LINE", "皮膚科 LINE", "内科 LINE公式",
    /* 経営 */
    "クリニック経営", "クリニック 集患 方法", "再診率 向上", "リピート率 向上", "無断キャンセル 防止",
    "クリニック 業務改善", "医療機関 LINE活用",
    /* 競合調査で発見した追加キーワード */
    "クリニック LINE 自動化", "クリニック LINE 問診", "クリニック LINE 患者対応",
    "クリニック LINE 再来院", "クリニック LINE リピーター", "クリニック LINE マーケティング",
    "オンライン診療 LINE予約", "オンライン診療 LINE 導入", "LINE診療 システム",
    "LINEドクター 代替", "LINEドクター 乗り換え",
    "医療 LINE 予約システム", "クリニック LINE予約 システム",
    "クリニック LINE公式アカウント 成功事例", "クリニック LINE 自動応答",
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
    images: [{ url: `${SITE_URL}/clinic/opengraph-image`, width: 1200, height: 630, alt: "クリニックのLINE公式アカウント運用プラットフォーム Lオペ — 予約・問診・オンライン診療・AI自動返信をLINEで一元化" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/clinic/opengraph-image`],
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
      "クリニック LINE公式アカウント運用",
      "オンライン診療 LINE連携",
      "医療機関 LINE公式アカウント活用",
      "クリニックDX",
      "患者CRM",
      "医療業務効率化",
      "オンライン問診",
      "セグメント配信",
      "AI自動返信",
      "電子カルテ連携",
      "クリニック 予約管理",
      "医療 LINE運用",
    ],
    sameAs: ["https://l-ope.jp/clinic/about"],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Lオペ for CLINIC",
    alternateName: "Lオペ",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "クリニック向けLINE公式アカウント運用・オンライン診療プラットフォーム",
    operatingSystem: "Web",
    description: DESCRIPTION,
    url: LP_URL,
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      url: LP_URL,
      price: "0",
      priceCurrency: "JPY",
      description: "初期相談・資料請求は無料。貴院の規模・運用体制に合わせた最適プランをご提案",
    },
    featureList:
      "患者CRM, セグメント配信, リッチメニュービルダー, オンライン問診, オンライン診療, 予約管理, AI自動返信, 決済管理, 配送管理, ダッシュボード分析, LINE公式アカウント運用",
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Lオペ for CLINIC",
    alternateName: "Lオペ",
    serviceType: "クリニック向けLINE公式アカウント運用・オンライン診療対応プラットフォーム",
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
      "クリニックのLINE公式アカウント運用・オンライン診療を一元化するプラットフォーム「Lオペ for CLINIC」",
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
    ],
  },
  /* MedicalBusiness — 医療機関向けサービスであることを明示 */
  {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: "Lオペ for CLINIC",
    description:
      "クリニック・病院・医療機関向けLINE公式アカウント運用プラットフォーム。予約管理・オンライン問診・オンライン診療・CRM・AI自動返信・決済を一元化。",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    medicalSpecialty: [
      "美容皮膚科",
      "一般内科",
      "歯科",
      "眼科",
      "整形外科",
      "小児科",
      "皮膚科",
      "AGAクリニック",
    ],
    availableService: {
      "@type": "MedicalTherapy",
      name: "クリニック向けLINE公式アカウント運用・オンライン診療プラットフォーム",
      description:
        "LINE公式アカウントを活用した患者CRM・予約管理・セグメント配信・オンライン問診・オンライン診療・AI自動返信・決済・配送管理",
    },
    areaServed: { "@type": "Country", name: "JP" },
    isAcceptingNewPatients: true,
  },
  /* HowTo — 導入ステップ（競合未実装のリッチリザルト獲得） */
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "クリニックへのLINE公式アカウント運用プラットフォーム導入方法",
    description: "Lオペ for CLINICの導入は4ステップ。お問い合わせから最短2週間で運用開始できます。",
    totalTime: "P14D",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "お問い合わせ・ヒアリング",
        text: "フォームまたはLINEからご相談。デモ画面をお見せしながら貴院の課題をヒアリングします。",
        url: `${LP_URL}/contact`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "プラン決定・ご契約",
        text: "貴院の規模・診療科・運用体制に合わせた最適プランをご提案。ご契約後、導入準備を開始します。",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "環境構築・設定代行",
        text: "LINE連携・リッチメニュー初期構築・問診フォーム作成・患者データ移行をサポートチームが代行します。",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "運用開始・継続サポート",
        text: "スタッフ向け操作研修を実施し運用開始。導入後も専任担当が活用提案を継続サポートします。",
      },
    ],
  },
  /* SiteNavigationElement — Googleサイトリンク表示を促進 */
  ...[
    { name: "Lオペとは", url: `${SITE_URL}/clinic/about` },
    { name: "機能一覧", url: `${SITE_URL}/clinic/features` },
    { name: "料金プラン", url: `${SITE_URL}/#pricing` },
    { name: "コラム", url: `${SITE_URL}/clinic/column` },
    { name: "お問い合わせ", url: `${SITE_URL}/clinic/contact` },
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
      {/* preconnect / dns-prefetch — 外部リソースの接続を高速化 */}
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
