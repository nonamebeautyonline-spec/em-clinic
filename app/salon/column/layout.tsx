import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | コラム | Lオペ for SALON",
    default: "コラム | Lオペ for SALON — サロンLINE運用情報",
  },
  openGraph: {
    siteName: "Lオペ for SALON",
    locale: "ja_JP",
    type: "article",
  },
};

export default function ColumnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
