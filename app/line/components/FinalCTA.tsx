"use client";

import { motion } from "motion/react";
import { FadeIn, FloatingLineIcons, PulseGlow } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   最終CTA — LINE緑のグラデーション + 浮遊アイコン装飾
   ═══════════════════════════════════════════════════════════════════════════ */

export function FinalCTA() {
  return (
    <section id="contact" className="relative overflow-hidden bg-gradient-to-br from-[#06C755] via-[#00B900] to-emerald-600 px-5 py-28 md:py-36">
      {/* 背景装飾 */}
      <FloatingLineIcons />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 h-[400px] w-[400px] rounded-full bg-white/[0.05] blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-emerald-300/10 blur-[80px]" />
      </div>

      <FadeIn className="relative mx-auto max-w-3xl text-center">
        {/* LINEアイコン */}
        <motion.div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.93 1.95 5.5 4.86 7.08-.17.62-.64 2.3-.73 2.65-.12.46.17.45.35.33.14-.1 2.19-1.47 3.08-2.07.47.07.95.11 1.44.11 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" />
          </svg>
        </motion.div>

        <h2 className="mb-4 text-[1.8rem] font-extrabold leading-snug text-white md:text-4xl lg:text-5xl">
          LINE運用を、<br className="md:hidden" />次のステージへ
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-[15px] leading-relaxed text-white/80">
          使用料0円、メッセージ従量課金。月間5,000通まで無料で、すべての機能をお試しいただけます。
        </p>

        {/* 数字アピール */}
        <div className="mx-auto mb-10 flex max-w-md justify-center gap-8">
          {[
            { value: "0円", label: "基本利用料" },
            { value: "3日", label: "最短導入期間" },
            { value: "0円", label: "初期費用" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-[11px] text-white/60">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <PulseGlow>
            <a
              href="/line/contact?ref=line"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-10 py-4 text-[14px] font-bold text-[#06C755] shadow-lg transition hover:bg-emerald-50 sm:w-auto"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#06C755"><path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.93 1.95 5.5 4.86 7.08-.17.62-.64 2.3-.73 2.65-.12.46.17.45.35.33.14-.1 2.19-1.47 3.08-2.07.47.07.95.11 1.44.11 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" /></svg>
              無料で始める
            </a>
          </PulseGlow>
        </div>
        <p className="mt-6 text-[11px] text-white/50">※ クレジットカード不要 / 契約期間の縛りなし / 無理な営業は一切行いません</p>
      </FadeIn>
    </section>
  );
}
