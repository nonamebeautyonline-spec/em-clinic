"use client";

import React from "react";

/* ──── Shared UI ──── */
export function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`px-5 py-24 md:py-32 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-4 inline-block rounded-full bg-blue-50 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-blue-600 uppercase">{children}</span>;
}

export function Title({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-slate-900 md:text-4xl lg:text-[2.6rem] ${className}`}>{children}</h2>;
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <p className="mx-auto mb-16 max-w-2xl text-[15px] leading-relaxed text-slate-400">{children}</p>;
}

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

/* カテゴリヘッダー */
export function CategoryHeader({ label, title, desc }: { label: string; title: string; desc: string }) {
  return (
    <div className="mb-12 text-center">
      <span className="mb-3 inline-block rounded-full bg-blue-50 px-4 py-1.5 text-[10px] font-bold tracking-[.18em] text-blue-600 uppercase">{label}</span>
      <h3 className="mb-3 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">{title}</h3>
      <p className="mx-auto max-w-xl text-[14px] leading-relaxed text-slate-400">{desc}</p>
    </div>
  );
}

/* 機能ブロック: 大きめモック + テキスト */
export function FeatureBlock({ title, desc, details, children, reverse = false }: {
  title: string; desc: string; details: string[]; children: React.ReactNode; reverse?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-14 ${reverse ? "lg:flex-row-reverse" : ""}`}>
      <div className="w-full lg:w-[58%]">{children}</div>
      <div className="w-full lg:w-[42%] lg:pt-4">
        <h4 className="mb-3 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">{title}</h4>
        <p className="mb-5 text-[14px] leading-[1.9] text-slate-500">{desc}</p>
        <ul className="space-y-2.5">
          {details.map((d) => (
            <li key={d} className="flex items-start gap-2.5 text-[13px] text-slate-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] text-blue-600">&#10003;</span>
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* フル幅モック（テキストは上部） */
export function FeatureWide({ title, desc, details, children }: {
  title: string; desc: string; details: string[]; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h4 className="mb-2 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">{title}</h4>
          <p className="max-w-xl text-[14px] leading-[1.9] text-slate-500">{desc}</p>
        </div>
        <ul className="flex flex-wrap gap-3">
          {details.map((d) => (
            <li key={d} className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
              <span className="text-[9px]">&#10003;</span>{d}
            </li>
          ))}
        </ul>
      </div>
      {children}
    </div>
  );
}
