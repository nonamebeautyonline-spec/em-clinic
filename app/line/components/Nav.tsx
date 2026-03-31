"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════════════════════
   ナビゲーション — スクロール連動 + LINE緑テーマ
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const bgColor = useTransform(scrollY, [0, 100], ["rgba(255,255,255,0.6)", "rgba(255,255,255,0.95)"]);
  const borderColor = useTransform(scrollY, [0, 100], ["rgba(226,232,240,0)", "rgba(226,232,240,1)"]);

  const links = [
    { label: "Lオペとは", href: "/line/about" },
    { label: "機能", href: "#features" },
    { label: "料金", href: "#pricing" },
    { label: "活用事例", href: "#usecases" },
    { label: "コラム", href: "/line/column" },
  ];

  const quickLinks = [
    { label: "機能", href: "#features" },
    { label: "料金", href: "#pricing" },
    { label: "コラム", href: "/line/column" },
    { label: "お問い合わせ", href: "/line/contact", accent: true },
  ];

  return (
    <motion.nav
      className="fixed top-0 z-50 w-full backdrop-blur-xl"
      style={{
        backgroundColor: bgColor,
        borderBottomColor: borderColor,
        borderBottomWidth: 1,
      }}
    >
      <div className="mx-auto flex h-[56px] max-w-6xl items-center justify-between px-4">
        <a href="/line" className="flex items-center gap-2">
          <Image src="/icon.png" alt="Lオペ" width={32} height={32} className="rounded-lg object-contain" priority />
          <span className="text-[14px] font-bold tracking-tight">Lオペ</span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[13px] font-medium text-slate-500 transition hover:text-[#06C755]">{l.label}</a>
          ))}
          <a
            href="/line/contact"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#06C755] to-[#00B900] px-5 py-2 text-[13px] font-bold text-white shadow-sm shadow-[#06C755]/20 transition hover:shadow-md"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.93 1.95 5.5 4.86 7.08-.17.62-.64 2.3-.73 2.65-.12.46.17.45.35.33.14-.1 2.19-1.47 3.08-2.07.47.07.95.11 1.44.11 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" /></svg>
            お問い合わせ
          </a>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="メニュー" aria-expanded={open} aria-controls="mobile-nav-menu">
          <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* モバイル用クイックナビ */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100/60 px-4 py-1.5 md:hidden">
        {quickLinks.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
              l.accent
                ? "bg-[#06C755] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-[#06C755]/10 hover:text-[#06C755]"
            }`}
          >
            {l.label}
          </a>
        ))}
      </div>

      {open && (
        <motion.div
          id="mobile-nav-menu"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-slate-100 bg-white px-5 pb-5 md:hidden"
        >
          {links.map((l) => (
            <a key={l.href} href={l.href} className="block py-3 text-sm text-slate-600 transition hover:text-[#06C755]" onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          <a
            href="/line/contact"
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#06C755] py-3 text-center text-sm font-bold text-white"
            onClick={() => setOpen(false)}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.93 1.95 5.5 4.86 7.08-.17.62-.64 2.3-.73 2.65-.12.46.17.45.35.33.14-.1 2.19-1.47 3.08-2.07.47.07.95.11 1.44.11 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" /></svg>
            お問い合わせ
          </a>
        </motion.div>
      )}
    </motion.nav>
  );
}
