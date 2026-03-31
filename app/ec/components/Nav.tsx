"use client";

import { useState } from "react";
import Image from "next/image";
import { ComingSoonBadge } from "./shared";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Lオペ for ECとは", href: "/ec/about" },
    { label: "機能", href: "#features" },
    { label: "料金", href: "#pricing" },
    { label: "活用事例", href: "#usecases" },
    { label: "コラム", href: "/ec/column" },
  ];
  const quickLinks = [
    { label: "機能", href: "#features" },
    { label: "料金", href: "#pricing" },
    { label: "コラム", href: "/ec/column" },
    { label: "事前登録", href: "/ec/contact", accent: true },
  ];

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-800/50 bg-[#1a1a2e]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[56px] max-w-6xl items-center justify-between px-4">
        <a href="/ec" className="flex items-center gap-2">
          <Image src="/icon.png" alt="Lオペ for EC" width={32} height={32} className="rounded-lg object-contain" priority />
          <span className="text-[14px] font-bold tracking-tight text-white">Lオペ <span className="text-[11px] font-semibold text-amber-400">for EC</span></span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[13px] font-medium text-slate-400 transition hover:text-amber-400">{l.label}</a>
          ))}
          <ComingSoonBadge size="small" />
          <a href="/ec/contact" className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-[13px] font-bold text-white shadow-sm shadow-amber-500/20 transition hover:shadow-md hover:shadow-amber-500/30">事前登録</a>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="メニュー" aria-expanded={open} aria-controls="mobile-nav-menu-ec">
          <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">{open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
        </button>
      </div>
      {/* モバイル用クイックナビ */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-800/30 px-4 py-1.5 md:hidden">
        {quickLinks.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
              l.accent
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400"
            }`}
          >
            {l.label}
          </a>
        ))}
      </div>
      {open && (
        <div id="mobile-nav-menu-ec" className="border-t border-slate-800/50 bg-[#1a1a2e] px-5 pb-5 md:hidden">
          {links.map((l) => <a key={l.href} href={l.href} className="block py-3 text-sm text-slate-400" onClick={() => setOpen(false)}>{l.label}</a>)}
          <a href="/ec/contact" className="mt-2 block rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-center text-sm font-bold text-white" onClick={() => setOpen(false)}>事前登録</a>
        </div>
      )}
    </nav>
  );
}
