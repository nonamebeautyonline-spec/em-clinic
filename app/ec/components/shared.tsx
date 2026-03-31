"use client";

import React from "react";
import { motion } from "motion/react";

/* ═══════════════════════════════════════════════════════════════════════════
   Lオペ for EC — 共通UIパーツ
   ダークネイビー＋ゴールド基調のEC特化デザイン
   ═══════════════════════════════════════════════════════════════════════════ */

export function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`px-5 py-24 md:py-32 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-4 inline-block rounded-full bg-amber-500/10 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-amber-400 uppercase">{children}</span>;
}

export function Title({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-white md:text-4xl lg:text-[2.6rem] ${className}`}>{children}</h2>;
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <p className="mx-auto mb-16 max-w-2xl text-[15px] leading-relaxed text-slate-400">{children}</p>;
}

/* ──── DashboardPanel: EC管理画面風パネル（ダークヘッダー） ──── */
export function DashboardPanel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-800/60 shadow-2xl shadow-black/30 backdrop-blur ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-700/60 bg-slate-900/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        <span className="ml-3 text-[10px] font-medium text-slate-500">{title}</span>
      </div>
      <div className="overflow-x-auto p-4 md:p-5">{children}</div>
    </div>
  );
}

/* ──── ComingSoonBadge: ゴールドアクセントの準備中バッジ ──── */
export function ComingSoonBadge({ className = "", size = "default" }: { className?: string; size?: "small" | "default" | "large" }) {
  const sizeClasses = {
    small: "px-3 py-1 text-[10px]",
    default: "px-4 py-1.5 text-[11px]",
    large: "px-6 py-2.5 text-[13px]",
  };

  return (
    <motion.span
      className={`inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/5 font-bold text-amber-400 backdrop-blur ${sizeClasses[size]} ${className}`}
      animate={{ boxShadow: ["0 0 0px rgba(245,158,11,0)", "0 0 20px rgba(245,158,11,0.15)", "0 0 0px rgba(245,158,11,0)"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
      </span>
      Coming Soon
    </motion.span>
  );
}
