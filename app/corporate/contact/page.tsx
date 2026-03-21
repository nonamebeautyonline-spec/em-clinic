"use client";

import Link from "next/link";
import TextReveal from "../components/TextReveal";
import ScrollReveal from "../components/ScrollReveal";
import TiltCard from "../components/TiltCard";

export default function ContactPage() {
  return (
    <div className="pt-[72px]">
      {/* ── ヒーロー ── */}
      <section className="px-6 py-28 md:px-16 md:py-44">
        <div className="mx-auto max-w-7xl">
          <span className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] text-slate-400">
            <span className="h-px w-8 bg-slate-300" />
            Contact
          </span>
          <div className="mt-8">
            <TextReveal as="h1" className="text-4xl font-black leading-[1.1] text-slate-900 md:text-7xl">
              Contact
            </TextReveal>
          </div>
        </div>
      </section>

      {/* ── カード ── */}
      <section className="border-t border-slate-100 px-6 py-20 md:px-16 md:py-28">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {/* 製品に関するお問い合わせ → Lオペ LP */}
          <ScrollReveal direction="left">
            <TiltCard className="h-full rounded-3xl" maxTilt={6}>
              <div className="flex h-full flex-col rounded-3xl border border-slate-100 p-10 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 md:p-12">
                <span className="text-[11px] font-medium tracking-[0.3em] text-slate-400">Product</span>
                <h2 className="mt-4 text-2xl font-black text-slate-900">製品に関するお問い合わせ</h2>
                <p className="mt-4 text-sm leading-[1.9] text-slate-500">
                  Lオペ for CLINIC の導入・デモ・料金については、サービスサイトから受け付けています。
                </p>
                <div className="mt-auto pt-8">
                  <Link
                    href="/lp#contact"
                    className="group inline-flex items-center gap-2 text-[13px] font-bold text-blue-600 transition-colors hover:text-blue-800"
                    data-cursor-hover
                  >
                    Lオペ お問い合わせページへ
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1">
                      <path d="M3 8h10m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>
              </div>
            </TiltCard>
          </ScrollReveal>

          {/* 法人お問い合わせ */}
          <ScrollReveal direction="right">
            <TiltCard className="h-full rounded-3xl" maxTilt={6}>
              <div className="flex h-full flex-col rounded-3xl border border-slate-100 p-10 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 md:p-12">
                <span className="text-[11px] font-medium tracking-[0.3em] text-slate-400">Corporate</span>
                <h2 className="mt-4 text-2xl font-black text-slate-900">法人お問い合わせ</h2>
                <p className="mt-4 text-sm leading-[1.9] text-slate-500">
                  業務提携・協業・取材・採用など
                </p>
                <div className="mt-auto pt-8">
                  <div className="rounded-2xl bg-slate-50 px-6 py-5">
                    <a
                      href="mailto:contact@ordix.co.jp"
                      className="text-sm text-slate-800 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-blue-600"
                      data-cursor-hover
                    >
                      contact@ordix.co.jp
                    </a>
                  </div>
                  <p className="mt-4 text-xs text-slate-400">通常1〜2営業日以内に返信</p>
                </div>
              </div>
            </TiltCard>
          </ScrollReveal>
        </div>
      </section>

      {/* ── 所在地（バーチャルオフィス） ── */}
      <section className="px-6 pb-20 md:px-16 md:pb-28">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="rounded-2xl bg-slate-50 px-8 py-6 md:px-10">
              <p className="text-[11px] font-medium tracking-[0.2em] text-slate-400">Registered Office</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                〒163-1302 東京都新宿区西新宿6丁目5-1 新宿アイランドタワー2階
              </p>
              <p className="mt-1 text-xs text-slate-400">※ 登記上の所在地です。来訪には対応していません。</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#050608] px-6 py-28 md:px-16 md:py-40">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-black text-white md:text-5xl">
              Let&apos;s build.
            </h2>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
