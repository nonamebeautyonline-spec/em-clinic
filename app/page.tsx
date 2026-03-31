import type { Metadata } from "next";
import HomeClient from "./home-client";

const SITE_URL = "https://l-ope.jp";
const TITLE = "Lオペ | 業種特化LINE運用プラットフォーム";
const DESCRIPTION =
  "クリニック・サロン・EC。あなたの業種に最適化されたLINE公式アカウント運用ツール。";

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
    "Lオペ",
    "LINE運用",
    "LINE公式アカウント",
    "クリニック LINE",
    "サロン LINE",
    "EC LINE",
    "LINE配信ツール",
    "LINE CRM",
    "業種特化",
    "LINE運用プラットフォーム",
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
        url: `${SITE_URL}/icon.png`,
        width: 778,
        height: 778,
        alt: "Lオペ — 業種特化LINE運用プラットフォーム",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/icon.png`],
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
      "Lオペは、業種に最適化されたLINE公式アカウント運用プラットフォームです。",
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
      "業種に最適化されたLINE公式アカウント運用プラットフォーム「Lオペ」",
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
