import type { Metadata } from "next";
import Link from "next/link";
import Header from "./components/Header";
import CustomCursor from "./components/CustomCursor";
import GrainOverlay from "./components/GrainOverlay";

export const metadata: Metadata = {
  title: "株式会社ORDIX | コーポレートサイト",
  description:
    "株式会社ORDIXの公式コーポレートサイト。業務管理システム・クラウドサービス・DX支援を提供しています。",
  icons: {
    icon: "/corporate/icon.svg",
  },
};

const FOOTER_LINKS = {
  Company: [
    { label: "会社概要", href: "/corporate/about" },
    { label: "事業内容", href: "/corporate/business" },
  ],
  Product: [
    { label: "プロダクト", href: "/corporate/product" },
    { label: "お問い合わせ", href: "/corporate/contact" },
  ],
};

export default function CorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-white text-slate-800"
      style={{ fontFeatureSettings: "'palt'" }}
    >
      <CustomCursor />
      <GrainOverlay />
      <Header />
      <main>{children}</main>

      {/* ── フッター ── */}
      <footer className="relative bg-[#050608] px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-16 md:flex-row md:justify-between">
            {/* 左: ロゴ + コピー */}
            <div className="max-w-xs">
              <Link href="/corporate" className="text-2xl font-black tracking-wider text-white">
                ORDIX
              </Link>
              <p className="mt-4 text-[13px] leading-relaxed text-slate-500">
                Software Development & DX
              </p>
            </div>

            {/* 右: リンク */}
            <div className="flex gap-20">
              {Object.entries(FOOTER_LINKS).map(([category, links]) => (
                <div key={category}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">
                    {category}
                  </p>
                  <nav className="mt-5 flex flex-col gap-3.5">
                    {links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-[13px] text-slate-400 transition-colors duration-300 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </div>

          {/* 下部 */}
          <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-slate-800/50 pt-10 md:flex-row">
            <p className="text-[11px] text-slate-700">
              &copy; 2026 株式会社ORDIX
            </p>
            <p className="text-[11px] text-slate-800">
              Tokyo, Japan
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
