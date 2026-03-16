"use client";

import { useState } from "react";
import Image from "next/image";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "機能", href: "#features" },
    { label: "強み", href: "#strengths" },
    { label: "活用シーン", href: "#usecases" },
    { label: "料金", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-100/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-5">
        <a href="#" className="flex items-center gap-2.5">
          <Image src="/icon.png" alt="Lオペ" width={36} height={36} className="rounded-lg object-contain" />
          <span className="text-[15px] font-bold tracking-tight">Lオペ <span className="text-blue-600">for CLINIC</span></span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => <a key={l.href} href={l.href} className="text-[13px] font-medium text-slate-500 transition hover:text-blue-600">{l.label}</a>)}
          <a href="/lp/contact" className="rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-[13px] font-bold text-white shadow-sm shadow-blue-500/20 transition hover:shadow-md">お問い合わせ</a>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="メニュー" aria-expanded={open} aria-controls="mobile-nav-menu">
          <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">{open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
        </button>
      </div>
      {open && (
        <div id="mobile-nav-menu" className="border-t border-slate-100 bg-white px-5 pb-5 md:hidden">
          {links.map((l) => <a key={l.href} href={l.href} className="block py-3 text-sm text-slate-600" onClick={() => setOpen(false)}>{l.label}</a>)}
          <a href="/lp/contact" className="mt-2 block rounded-lg bg-blue-600 py-3 text-center text-sm font-bold text-white" onClick={() => setOpen(false)}>お問い合わせ</a>
        </div>
      )}
    </nav>
  );
}
