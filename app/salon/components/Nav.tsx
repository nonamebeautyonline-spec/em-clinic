"use client";

import { useState } from "react";
import Image from "next/image";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Lオペ for SALONとは", href: "/salon/about" },
    { label: "機能", href: "#features" },
    { label: "料金", href: "#pricing" },
    { label: "活用事例", href: "#usecases" },
    { label: "コラム", href: "/salon/column" },
  ];
  const quickLinks = [
    { label: "機能", href: "#features" },
    { label: "料金", href: "#pricing" },
    { label: "コラム", href: "/salon/column" },
    { label: "事前登録", href: "/salon/contact", accent: true },
  ];
  return (
    <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[56px] max-w-6xl items-center justify-between px-4">
        <a href="/salon" className="flex items-center gap-2">
          <Image src="/icon.png" alt="Lオペ for SALON" width={32} height={32} className="rounded-lg object-contain" priority />
          <span className="text-[14px] font-bold tracking-tight">Lオペ <span className="text-pink-500">for SALON</span></span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => <a key={l.href} href={l.href} className="text-[13px] font-medium text-slate-500 transition hover:text-pink-600">{l.label}</a>)}
          <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-[10px] font-bold text-yellow-700">Coming Soon</span>
          <a href="/salon/contact" className="rounded-lg bg-gradient-to-r from-pink-500 to-rose-400 px-5 py-2 text-[13px] font-bold text-white shadow-sm shadow-pink-500/20 transition hover:shadow-md">事前登録</a>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="メニュー" aria-expanded={open} aria-controls="mobile-nav-menu">
          <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">{open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
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
                ? "bg-pink-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-pink-50 hover:text-pink-600"
            }`}
          >
            {l.label}
          </a>
        ))}
      </div>
      {open && (
        <div id="mobile-nav-menu" className="border-t border-slate-100 bg-white px-5 pb-5 md:hidden">
          {links.map((l) => <a key={l.href} href={l.href} className="block py-3 text-sm text-slate-600" onClick={() => setOpen(false)}>{l.label}</a>)}
          <a href="/salon/contact" className="mt-2 block rounded-lg bg-pink-500 py-3 text-center text-sm font-bold text-white" onClick={() => setOpen(false)}>事前登録</a>
        </div>
      )}
    </nav>
  );
}
