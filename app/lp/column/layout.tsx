import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Lオペ コラム - Lオペ for CLINIC",
    default: "Lオペ コラム | クリニックLINE活用・DX情報 - Lオペ for CLINIC",
  },
  openGraph: {
    siteName: "Lオペ for CLINIC",
    locale: "ja_JP",
    type: "article",
  },
};

export default function ColumnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
