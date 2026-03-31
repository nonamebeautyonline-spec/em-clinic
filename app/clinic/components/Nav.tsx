"use client";

import { useState } from "react";
import Image from "next/image";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Lオペとは", href: "/clinic/about" },
    { label: "機能", href: "#features" },
    { label: "強み", href: "#strengths" },
    { label: "活用シーン", href: "#usecases" },
    { label: "料金", href: "#pricing" },
    { label: "コラム", href: "/clinic/column" },
  ];
  const quickLinks = [
    { label: "機能", href: "#features" },
    { label: "料金", href: "#pricing" },
    { label: "コラム", href: "/clinic/column" },
    { label: "お問い合わせ", href: "/clinic/contact", accent: true },
  ];
  return (
    <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[56px] max-w-6xl items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2">
          <Image src="/icon.png" alt="Lオペ" width={32} height={32} className="rounded-lg object-contain" priority />
          <span className="text-[14px] font-bold tracking-tight">Lオペ <span className="text-blue-600">for CLINIC</span></span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => <a key={l.href} href={l.href} className="text-[13px] font-medium text-slate-500 transition hover:text-blue-600">{l.label}</a>)}
          <a href="/clinic/contact" className="rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-[13px] font-bold text-white shadow-sm shadow-blue-500/20 transition hover:shadow-md">お問い合わせ</a>
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
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            {l.label}
          </a>
        ))}
      </div>
      {open && (
        <div id="mobile-nav-menu" className="border-t border-slate-100 bg-white px-5 pb-5 md:hidden">
          {links.map((l) => <a key={l.href} href={l.href} className="block py-3 text-sm text-slate-600" onClick={() => setOpen(false)}>{l.label}</a>)}
          <a href="/clinic/contact" className="mt-2 block rounded-lg bg-blue-600 py-3 text-center text-sm font-bold text-white" onClick={() => setOpen(false)}>お問い合わせ</a>
        </div>
      )}
    </nav>
  );
}
