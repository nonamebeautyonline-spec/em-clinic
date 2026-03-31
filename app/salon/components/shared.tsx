"use client";

import React from "react";

/* ──── 汎用UIパーツ（Lオペ for SALON — ピンクテーマ） ──── */
export function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`px-5 py-24 md:py-32 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-4 inline-block rounded-full bg-pink-50 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-pink-600 uppercase">{children}</span>;
}

export function Title({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-slate-900 md:text-4xl lg:text-[2.6rem] ${className}`}>{children}</h2>;
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <p className="mx-auto mb-16 max-w-2xl text-[15px] leading-relaxed text-slate-400">{children}</p>;
}

export function MockWindow({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-pink-200/30 ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-[10px] font-medium text-slate-400">{title}</span>
      </div>
      <div className="overflow-x-auto p-4 md:p-5">{children}</div>
    </div>
  );
}
