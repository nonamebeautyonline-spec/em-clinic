import type { Metadata } from "next";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ お問い合わせ・資料請求 | 無料相談・デモ案内",
  description:
    "Lオペ for CLINICへのお問い合わせ・資料請求はこちら。クリニックのLINE公式アカウント活用に関するご相談、デモのご案内、導入に関するご質問を受け付けています。",
  keywords: "Lオペ 資料請求, Lオペ 問い合わせ, クリニック LINE 導入 相談, LINE公式アカウント クリニック 見積もり, クリニック DX 相談, クリニック LINE 費用",
  alternates: { canonical: `${SITE_URL}/clinic/contact` },
  openGraph: {
    title: "Lオペ お問い合わせ・資料請求 | 無料相談・デモ案内",
    description:
      "クリニックのLINE活用に関するご相談・資料請求・デモのご案内はこちらから。",
    url: `${SITE_URL}/clinic/contact`,
    siteName: "Lオペ for CLINIC",
    locale: "ja_JP",
    type: "website",
    images: [{ url: `${SITE_URL}/clinic/contact/opengraph-image`, width: 1200, height: 630 }],
  },
};

/* JSON-LD 構造化データ */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "お問い合わせ | Lオペ for CLINIC",
  url: `${SITE_URL}/clinic/contact`,
  isPartOf: { "@type": "WebSite", name: "Lオペ for CLINIC", url: SITE_URL },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "資料請求後、すぐに営業の連絡が来ますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "いいえ、まず資料をお送りし、ご希望の場合のみオンラインデモをご案内します。",
      },
    },
    {
      "@type": "Question",
      name: "費用は発生しますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "資料請求・ご相談は完全無料です。",
      },
    },
    {
      "@type": "Question",
      name: "どのような資料がもらえますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "機能概要・導入事例・料金プランをまとめた資料をお送りします。",
      },
    },
  ],
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
