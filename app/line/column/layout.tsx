import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | コラム | Lオペ for LINE",
    default: "コラム | Lオペ for LINE — LINE公式アカウント運用情報",
  },
  openGraph: {
    siteName: "Lオペ for LINE",
    locale: "ja_JP",
    type: "article",
  },
};

export default function ColumnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
