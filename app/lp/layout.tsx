import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lオペ for CLINIC | クリニック特化LINE運用プラットフォーム",
  description:
    "LINE公式アカウントを活用したクリニック業務のDX化。患者CRM・予約管理・セグメント配信・リッチメニュー構築・問診フォーム・会計管理をオールインワンで提供。",
};

export default function LPLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
