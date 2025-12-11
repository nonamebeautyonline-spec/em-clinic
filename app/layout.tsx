// app/layout.tsx

<meta name="color-scheme" content="light only">


import "./globals.css";
import type { Metadata, Viewport } from "next";  // ★ Viewport を追加
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

// ★ ここを追加（スマホのズーム・幅を明示）
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale を付けるとピンチズーム制限されるので、
  // 必要なら maximumScale: 1 とかもありですが、
  // まずはユーザー操作を残しておく方が無難です。
  viewportFit: "cover",
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
        <LayoutTransition>{children}</LayoutTransition>
      </body>
    </html>
  );
}
