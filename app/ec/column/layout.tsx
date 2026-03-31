import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | コラム | Lオペ for EC",
    default: "コラム | Lオペ for EC — EC向けLINE運用情報",
  },
  openGraph: {
    siteName: "Lオペ for EC",
    locale: "ja_JP",
    type: "article",
  },
};

export default function ColumnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
