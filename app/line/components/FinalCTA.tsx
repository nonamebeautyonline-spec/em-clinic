"use client";

import { FadeIn } from "./animations";

export function FinalCTA() {
  return (
    <section id="contact" className="bg-gradient-to-br from-[#06C755] via-emerald-500 to-green-500 px-5 py-24 md:py-32">
      <FadeIn className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-[1.7rem] font-extrabold leading-snug text-white md:text-4xl">LINE運用を、<br className="md:hidden" />次のステージへ</h2>
        <p className="mx-auto mb-10 max-w-xl text-[14px] leading-relaxed text-emerald-100">使用料0円、メッセージ従量課金。まずはお気軽にお試しください。</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="/line/contact?ref=line" className="w-full rounded-xl bg-white px-10 py-4 text-[13px] font-bold text-emerald-700 shadow-lg transition hover:bg-emerald-50 sm:w-auto">無料で始める</a>
        </div>
        <p className="mt-6 text-[11px] text-emerald-200">※ クレジットカード不要 / 無理な営業は一切行いません</p>
      </FadeIn>
    </section>
  );
}
