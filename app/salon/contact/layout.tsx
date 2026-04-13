import type { Metadata } from "next";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ for SALON お問い合わせ・無料相談 | サロンLINE運用",
  description:
    "Lオペ for SALONへのお問い合わせ・無料相談はこちら。サロンのLINE運用に関するご相談、デモのご案内、導入に関するご質問を受け付けています。",
  keywords: "Lオペ for SALON 問い合わせ, サロン LINE 相談, 美容室 LINE 導入, ネイルサロン LINE, エステ LINE 見積もり",
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/salon/contact` },
  openGraph: {
    title: "Lオペ for SALON お問い合わせ・無料相談",
    description: "サロンのLINE運用に関するご相談・デモのご案内はこちらから。",
    url: `${SITE_URL}/salon/contact`,
    siteName: "Lオペ for SALON",
    locale: "ja_JP",
    type: "website",
  },
};

/* JSON-LD */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "お問い合わせ | Lオペ for SALON",
  url: `${SITE_URL}/salon/contact`,
  isPartOf: { "@type": "WebSite", name: "Lオペ for SALON", url: SITE_URL },
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
      acceptedAnswer: { "@type": "Answer", text: "お問い合わせ・ご相談は完全無料です。ライトプランなら月額9,800円からご利用いただけます。" },
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
