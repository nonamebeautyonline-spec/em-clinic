// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import LayoutTransition from "./layoutTransition"; // ★ 追加：クライアントラッパ

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "のなめビューティー | マイページ",
  description: "のなめビューティー オンライン処方 マイページ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body
        className={
          notoSans.className +
          " bg-[#F9FAFB] text-slate-900 antialiased"
        }
      >
        {/* ここだけクライアントコンポーネントで包む */}
        <LayoutTransition>{children}</LayoutTransition>
      </body>
    </html>
  );
}
