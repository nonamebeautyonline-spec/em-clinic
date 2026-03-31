"use client";

import { MockWindow } from "./shared";
import { AnimatedBlob, TextReveal, FadeIn, StaggerChildren, StaggerItem, PulseGlow } from "./animations";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50/80 via-white to-rose-50/50" />
      <AnimatedBlob className="-top-40 right-0" color="bg-pink-100/40" size={500} />
      <AnimatedBlob className="-bottom-60 -left-40" color="bg-rose-100/30" size={600} />
      <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-20 md:pt-24 md:pb-28">
        {/* Coming Soon バナー */}
        <div className="mb-8 rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-3.5 text-center text-[14px] font-semibold text-yellow-800 shadow-sm">
          Coming Soon &mdash; 2026年夏リリース予定。事前登録受付中です。
        </div>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <FadeIn>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-pink-200/60 bg-white/60 px-4 py-1.5 text-[11px] font-semibold text-pink-700 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />サロン特化LINE運用プラットフォーム
              </div>
            </FadeIn>
            <TextReveal>
              <h1 className="mb-6 text-[2.2rem] font-extrabold leading-[1.25] tracking-tight md:text-5xl lg:text-[3.2rem]">
                サロンのLINE運用を、<br />
                <span className="bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">ひとつに。</span>
              </h1>
              <p className="sr-only">Lオペ for SALON（エルオペ フォー サロン）は美容室・ネイル・エステ等のサロン向けLINE公式アカウント運用プラットフォームです。</p>
            </TextReveal>
            <FadeIn delay={0.2}>
              <p className="mb-8 max-w-lg text-[15px] leading-[1.8] text-slate-500">
                予約管理・顧客管理・セグメント配信・リッチメニュー・スタンプカード・物販まで。サロン経営に必要なLINE機能をすべてひとつの管理画面で。
              </p>
            </FadeIn>
            <div className="flex flex-wrap gap-3">
              <PulseGlow>
                <a href="/salon/contact" className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 px-8 py-3.5 text-[13px] font-bold text-white shadow-lg shadow-pink-500/20 transition hover:shadow-xl">事前登録はこちら</a>
              </PulseGlow>
              <a href="#features" className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-[13px] font-bold text-slate-600 transition hover:border-pink-200 hover:text-pink-600">機能を見る</a>
            </div>
            <StaggerChildren className="mt-10 flex flex-wrap gap-6 text-[11px] text-slate-400">
              {["月額9,800円から", "最短3日で導入", "全サロン業態対応"].map((t) => (
                <StaggerItem key={t}>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-pink-500" />{t}</span>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
          <FadeIn direction="right" delay={0.3}>
            <div className="relative" role="img" aria-label="Lオペ for SALONのダッシュボード画面：予約数、顧客数、リピート率を一覧表示">
              <MockWindow title="Lオペ for SALON  ダッシュボード">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "今月の予約", val: "284", unit: "件", bg: "bg-pink-50", text: "text-pink-600" },
                    { label: "LINE顧客数", val: "3,820", unit: "人", bg: "bg-rose-50", text: "text-rose-600" },
                    { label: "リピート率", val: "78.4", unit: "%", bg: "bg-amber-50", text: "text-amber-600" },
                    { label: "物販売上", val: "42.5", unit: "万", bg: "bg-violet-50", text: "text-violet-600" },
                  ].map((k) => (
                    <div key={k.label} className={`rounded-lg ${k.bg} p-2.5`}>
                      <div className="text-[11px] text-slate-400">{k.label}</div>
                      <div className={`mt-0.5 text-lg font-bold leading-none ${k.text}`}>{k.val}<span className="text-[10px] font-normal text-slate-400">{k.unit}</span></div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="col-span-2 rounded-lg bg-slate-50 p-3">
                    <div className="mb-2 text-[11px] font-semibold text-slate-500">来店数推移（7日間）</div>
                    <div className="flex items-end gap-1" style={{ height: 60 }}>
                      {[45, 38, 52, 60, 42, 70, 65].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-pink-500 to-rose-300" style={{ height: `${h}%` }} />)}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-300"><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <div className="text-[11px] font-semibold text-slate-500">配信結果</div>
                      <div className="mt-1 text-[10px] text-pink-700">開封率 <span className="font-bold">85.2%</span></div>
                      <div className="text-[10px] text-pink-700">来店率 <span className="font-bold">32.1%</span></div>
                    </div>
                    <div className="rounded-lg bg-pink-50 p-2.5">
                      <div className="text-[11px] font-semibold text-pink-600">スタンプ</div>
                      <div className="mt-1 text-[10px] text-pink-700">利用者 <span className="font-bold">1,847人</span></div>
                    </div>
                  </div>
                </div>
              </MockWindow>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
