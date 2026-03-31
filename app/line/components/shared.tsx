"use client";

import React from "react";

/* ──── 汎用UIパーツ（Lオペ無印 — LINE緑テーマ） ──── */
export function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`px-5 py-24 md:py-32 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-4 inline-block rounded-full bg-[#06C755]/10 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-[#06C755] uppercase">{children}</span>;
}

export function Title({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-slate-900 md:text-4xl lg:text-[2.6rem] ${className}`}>{children}</h2>;
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <p className="mx-auto mb-16 max-w-2xl text-[15px] leading-relaxed text-slate-400">{children}</p>;
}

/* ──── MockWindow: macOS風ウインドウ ──── */
export function MockWindow({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-[10px] font-medium text-slate-400">{title}</span>
      </div>
      <div className="overflow-x-auto p-4 md:p-5">{children}</div>
    </div>
  );
}

/* ──── MockPhone: スマホ風フレーム ──── */
export function MockPhone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto w-[280px] rounded-[2.5rem] border-[6px] border-slate-800 bg-slate-800 p-1 shadow-2xl sm:w-[300px] ${className}`}>
      {/* ノッチ */}
      <div className="absolute top-0 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-b-xl bg-slate-800" />
      <div className="overflow-hidden rounded-[2rem] bg-white">
        {children}
      </div>
    </div>
  );
}

/* ──── LineChatHeader: LINEトーク画面のヘッダー ──── */
export function LineChatHeader({ name = "Lオペ", className = "" }: { name?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3 bg-[#06C755] px-4 py-3 ${className}`}>
      <svg className="h-4 w-4 text-white/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.93 1.95 5.5 4.86 7.08-.17.62-.64 2.3-.73 2.65-.12.46.17.45.35.33.14-.1 2.19-1.47 3.08-2.07.47.07.95.11 1.44.11 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" /></svg>
        </div>
        <span className="text-[14px] font-bold text-white">{name}</span>
      </div>
    </div>
  );
}

/* ──── SectionDivider: 波形セクション区切り ──── */
export function SectionDivider({ color = "#ffffff", flip = false }: { color?: string; flip?: boolean }) {
  return (
    <div className={`w-full overflow-hidden leading-none ${flip ? "rotate-180" : ""}`}>
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-12 w-full md:h-20">
        <path d="M0,60 C200,120 400,0 600,60 C800,120 1000,0 1200,60 L1200,120 L0,120 Z" fill={color} />
      </svg>
    </div>
  );
}
