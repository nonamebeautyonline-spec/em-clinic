import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お申し込み | Lオペ for CLINIC",
  description:
    "Lオペ for CLINICのお申し込みフォーム。プラン選択・オプション選択・見積もり確認が可能です。",
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
