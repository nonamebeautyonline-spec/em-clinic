import type { Metadata } from "next";

export const metadata: Metadata = {
  openGraph: {
    siteName: "Lオペ for CLINIC",
    locale: "ja_JP",
    type: "article",
  },
};

export default function ColumnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
