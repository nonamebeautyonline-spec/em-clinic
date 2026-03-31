"use client";

import Image from "next/image";
import Link from "next/link";

/* ═══════════════════════════════════════════════════════════════════════════
   フッター — ダークテーマ + LINE緑アクセント
   ═══════════════════════════════════════════════════════════════════════════ */

export function Footer() {
  const navGroups = [
    {
      title: "サービス",
      links: [
        { label: "Lオペ for LINEとは", href: "/line/about" },
        { label: "機能一覧", href: "/line/features" },
        { label: "料金", href: "#pricing" },
        { label: "活用事例", href: "#usecases" },
      ],
    },
    {
      title: "リソース",
      links: [
        { label: "コラム", href: "/line/column" },
        { label: "FAQ", href: "#faq" },
        { label: "お問い合わせ", href: "/line/contact" },
      ],
    },
    {
      title: "会社情報",
      links: [
        { label: "運営会社", href: "https://ordix.co.jp", external: true },
        { label: "利用規約", href: "/clinic/terms" },
        { label: "プライバシーポリシー", href: "/clinic/privacy" },
      ],
    },
  ];

  return (
    <footer className="bg-slate-900 px-5 py-14 text-slate-400">
      <div className="mx-auto max-w-6xl">
        {/* 上部: ロゴ + ナビゲーショングループ */}
        <div className="grid gap-10 md:grid-cols-4">
          {/* ロゴ・概要 */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 text-[14px] font-bold text-white">
              <Image src="/icon.png" alt="Lオペ for LINE" width={32} height={32} className="rounded-lg object-contain" />
              Lオペ for LINE
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
              LINE公式アカウント運用を、<br />もっとシンプルに。
            </p>
            {/* LINEアイコン */}
            <div className="mt-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#06C755]/10">
                <svg className="h-4 w-4 text-[#06C755]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.93 1.95 5.5 4.86 7.08-.17.62-.64 2.3-.73 2.65-.12.46.17.45.35.33.14-.1 2.19-1.47 3.08-2.07.47.07.95.11 1.44.11 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" /></svg>
              </div>
            </div>
          </div>

          {/* ナビゲーションリンク */}
          {navGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wider text-slate-500">{group.title}</h3>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-[13px] transition hover:text-[#06C755]">{link.label}</a>
                    ) : link.href.startsWith("#") ? (
                      <a href={link.href} className="text-[13px] transition hover:text-[#06C755]">{link.label}</a>
                    ) : (
                      <Link href={link.href} className="text-[13px] transition hover:text-[#06C755]">{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* パートナー募集 */}
        <div className="mt-8 border-t border-slate-800 pt-6 text-center">
          <p className="text-[12px] font-semibold text-slate-500">連携・代理店パートナー募集</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Lオペとの連携・代理店についてのご相談は
            <a href="mailto:partner@l-ope.jp" className="text-emerald-400 underline ml-1">partner@l-ope.jp</a>
            までお問い合わせください。
          </p>
        </div>

        {/* 下部: コピーライト */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-[11px] md:flex-row">
          <div className="flex gap-5">
            <a href="/clinic/terms" className="transition hover:text-[#06C755]">利用規約</a>
            <a href="/clinic/privacy" className="transition hover:text-[#06C755]">プライバシーポリシー</a>
          </div>
          <div className="text-center md:text-right">
            <p className="text-slate-500">
              運営:{" "}
              <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="underline decoration-slate-600 underline-offset-2 transition hover:text-[#06C755]">
                株式会社ORDIX
              </a>
            </p>
            <p className="mt-1">&copy; 2026 株式会社ORDIX. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
