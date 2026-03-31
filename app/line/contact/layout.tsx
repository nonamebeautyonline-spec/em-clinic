import type { Metadata } from "next";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ for LINE お問い合わせ・無料相談 | LINE運用プラットフォーム",
  description:
    "Lオペ for LINEへのお問い合わせ・無料相談はこちら。LINE公式アカウント運用に関するご相談、デモのご案内、導入に関するご質問を受け付けています。",
  keywords: "Lオペ for LINE 問い合わせ, Lオペ for LINE 無料相談, LINE公式アカウント 導入 相談, LINE配信ツール 見積もり, LINE運用 相談",
  alternates: { canonical: `${SITE_URL}/line/contact` },
  openGraph: {
    title: "Lオペ for LINE お問い合わせ・無料相談",
    description: "LINE公式アカウント運用に関するご相談・デモのご案内はこちらから。",
    url: `${SITE_URL}/line/contact`,
    siteName: "Lオペ for LINE",
    locale: "ja_JP",
    type: "website",
  },
};

/* JSON-LD */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "お問い合わせ | Lオペ for LINE",
  url: `${SITE_URL}/line/contact`,
  isPartOf: { "@type": "WebSite", name: "Lオペ for LINE", url: SITE_URL },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "お問い合わせ後、すぐに営業の連絡が来ますか？",
      acceptedAnswer: { "@type": "Answer", text: "いいえ、まずご要望に応じた資料をお送りし、ご希望の場合のみデモをご案内します。" },
    },
    {
      "@type": "Question",
      name: "費用は発生しますか？",
      acceptedAnswer: { "@type": "Answer", text: "お問い合わせ・ご相談は完全無料です。フリープランなら月額0円でご利用いただけます。" },
    },
    {
      "@type": "Question",
      name: "どのような資料がもらえますか？",
      acceptedAnswer: { "@type": "Answer", text: "機能概要・導入事例・料金プランをまとめた資料をお送りします。" },
    },
  ],
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
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
