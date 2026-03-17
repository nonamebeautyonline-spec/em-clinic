import type { Metadata } from "next";
import ColumnIndex from "./_components/column-index";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "コラム | Lオペ for CLINIC — クリニック LINE活用・DX情報",
  description:
    "クリニックのLINE公式アカウント活用事例・DX導入ガイド・ツール比較など、クリニック経営に役立つ情報を発信。Lオペ for CLINIC公式コラム。",
  alternates: { canonical: `${SITE_URL}/lp/column` },
  openGraph: {
    title: "コラム | Lオペ for CLINIC",
    description: "クリニックのLINE活用・DX情報を発信するLオペ for CLINIC公式コラム。",
    url: `${SITE_URL}/lp/column`,
  },
};

export default function ColumnIndexPage() {
  return <ColumnIndex />;
}
