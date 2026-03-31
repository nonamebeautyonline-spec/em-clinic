import type { Metadata } from "next";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ for EC お問い合わせ・無料トライ��ル | EC向けLINE運用プラットフォ��ム",
  description:
    "Lオペ for ECへのお問い合わせ・無料トライアルはこちら。ECサイトのLINE運用に関するご相談、デモのご案内、導入に関するご質問を受け付けています。",
  keywords: "Lオペ for EC 問い合わせ, Lオペ for EC 無料トライアル, EC LINE運用 相談, EC LINE連携 導入",
  alternates: { canonical: `${SITE_URL}/ec/contact` },
  openGraph: {
    title: "Lオ��� for EC お問い合わせ・無料トライアル",
    description: "ECサイトのLINE運用に関するご相談・デモのご案内はこちらから。",
    url: `${SITE_URL}/ec/contact`,
    siteName: "Lオペ for EC",
    locale: "ja_JP",
    type: "website",
  },
};

/* JSON-LD */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "お問い合わせ | Lオペ for EC",
  url: `${SITE_URL}/ec/contact`,
  isPartOf: { "@type": "WebSite", name: "Lオペ for EC", url: SITE_URL },
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
      name: "無料トライアルに費用は発生しますか？",
      acceptedAnswer: { "@type": "Answer", text: "14日間の無料トライアルは完全無料です。クレジットカードの登録も不要です。" },
    },
    {
      "@type": "Question",
      name: "どのような資料がもらえますか？",
      acceptedAnswer: { "@type": "Answer", text: "機能概要・導入事例・料金プランをまとめた資料をお送りし���す。" },
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
