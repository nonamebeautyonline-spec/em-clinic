import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | コラム | Lオペ",
    default: "コラム | Lオペ — LINE公式アカウント運用情報",
  },
  openGraph: {
    siteName: "Lオペ",
    locale: "ja_JP",
    type: "article",
  },
};

export default function ColumnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
