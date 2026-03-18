import type { Metadata } from "next";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "お問い合わせ・資料請求 | Lオペ for CLINIC",
  description:
    "Lオペ for CLINICへのお問い合わせ・資料請求はこちら。クリニックのLINE公式アカウント活用に関するご相談、デモのご案内、導入に関するご質問を受け付けています。",
  keywords: "Lオペ 資料請求, Lオペ 問い合わせ, クリニック LINE 導入 相談, LINE公式アカウント クリニック 見積もり, クリニック DX 相談, クリニック LINE 費用",
  alternates: { canonical: `${SITE_URL}/lp/contact` },
  openGraph: {
    title: "お問い合わせ・資料請求 | Lオペ for CLINIC",
    description:
      "クリニックのLINE活用に関するご相談・資料請求・デモのご案内はこちらから。",
    url: `${SITE_URL}/lp/contact`,
    siteName: "Lオペ for CLINIC",
    locale: "ja_JP",
    type: "website",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
