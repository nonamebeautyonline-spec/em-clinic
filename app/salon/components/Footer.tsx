"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ComingSoonBadge } from "./shared";

/* ═══════════════════════════════════════════════════════════════════════════
   フッター — ダークテーマ + ローズゴールドアクセント
   ═══════════════════════════════════════════════════════════════════════════ */

const footerLinks = [
  {
    title: "サービス",
    links: [
      { label: "Lオペ for SALONとは", href: "/salon/about" },
      { label: "機能一覧", href: "/salon/features" },
      { label: "料金プラン", href: "/salon#pricing" },
      { label: "活用事例", href: "/salon#usecases" },
    ],
  },
  {
    title: "サポート",
    links: [
      { label: "FAQ", href: "/salon#faq" },
      { label: "コラム", href: "/salon/column" },
      { label: "お問い合わせ", href: "/salon/contact" },
    ],
  },
  {
    title: "会社情報",
    links: [
      { label: "運営会社", href: "https://ordix.co.jp", external: true },
      { label: "利用規約", href: "/salon/terms" },
      { label: "プライバシーポリシー", href: "/salon/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-slate-900 px-5 py-14 text-slate-400">
      {/* 装飾 */}
      <div className="pointer-events-none absolute top-0 left-1/4 h-48 w-48 rounded-full bg-pink-500/5 blur-[80px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-rose-500/5 blur-[80px]" />

      <div className="relative mx-auto max-w-6xl">
        {/* 上部: ロゴ + リンクグリッド */}
        <div className="grid gap-10 md:grid-cols-4">
          {/* ロゴ + 説明 */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 text-[14px] font-bold text-white">
              <Image
                src="/icon.png"
                alt="Lオペ for SALON"
                width={32}
                height={32}
                className="rounded-lg object-contain"
              />
              Lオペ{" "}
              <span className="bg-gradient-to-r from-pink-400 to-rose-300 bg-clip-text text-transparent">
                for SALON
              </span>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
              サロン特化のLINE運用プラットフォーム。
              予約管理から物販まで、ひとつに。
            </p>
            <div className="mt-3">
              <ComingSoonBadge className="text-[9px] border-pink-500/30 bg-pink-500/10 text-pink-400" />
            </div>
          </div>

          {/* リンクグリッド */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="mb-3 text-[12px] font-bold tracking-wider text-slate-300 uppercase">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] transition hover:text-pink-400"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[12px] transition hover:text-pink-400"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 装飾線 */}
        <div className="my-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />
          <div className="h-1.5 w-1.5 rounded-full bg-pink-500/30" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />
        </div>

        {/* 下部 */}
        <div className="flex flex-col items-center justify-between gap-4 text-[11px] md:flex-row">
          <div className="flex gap-5">
            <Link href="/salon/terms" className="hover:text-pink-400 transition">
              利用規約
            </Link>
            <Link href="/salon/privacy" className="hover:text-pink-400 transition">
              プライバシーポリシー
            </Link>
          </div>
          <div className="text-center md:text-right">
            <p className="text-slate-500">
              運営:{" "}
              <a
                href="https://ordix.co.jp"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-slate-600 underline-offset-2 transition hover:text-pink-400"
              >
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
