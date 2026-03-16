"use client";

import { FadeIn } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   最終CTA
   ═══════════════════════════════════════════════════════════════════════════ */

export function FinalCTA() {
  return (
    <section id="contact" className="bg-gradient-to-br from-blue-500 via-sky-500 to-blue-400 px-5 py-24 md:py-32">
      <FadeIn className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-[1.7rem] font-extrabold leading-snug text-white md:text-4xl">LINE活用で、<br className="md:hidden" />クリニック経営を次のステージへ</h2>
        <p className="mx-auto mb-10 max-w-xl text-[14px] leading-relaxed text-blue-100">まずは資料請求から。貴院の課題に合わせたデモのご案内も可能です。</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="mailto:info@l-ope.jp" className="w-full rounded-xl bg-white px-10 py-4 text-[13px] font-bold text-blue-700 shadow-lg transition hover:bg-blue-50 sm:w-auto">無料で資料請求・お問い合わせ</a>
          <a href="mailto:info@l-ope.jp" className="w-full rounded-xl border-2 border-white/25 px-10 py-4 text-[13px] font-bold text-white transition hover:bg-white/10 sm:w-auto">メールでお問い合わせ</a>
        </div>
        <p className="mt-6 text-[11px] text-blue-200">※ 無理な営業は一切行いません</p>
      </FadeIn>
    </section>
  );
}
