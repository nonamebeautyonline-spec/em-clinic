"use client";

import { MockWindow } from "./shared";
import { AnimatedBlob, TextReveal, FadeIn, StaggerChildren, StaggerItem, PulseGlow } from "./animations";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-stone-50/80 via-white to-amber-50/50" />
      <AnimatedBlob className="-top-40 right-0" color="bg-stone-200/40" size={500} />
      <AnimatedBlob className="-bottom-60 -left-40" color="bg-amber-100/30" size={600} />
      <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-20 md:pt-24 md:pb-28">
        {/* Coming Soon バナー */}
        <div className="mb-8 rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-3.5 text-center text-[14px] font-semibold text-yellow-800 shadow-sm">
          Coming Soon &mdash; 2026年夏リリース予定。事前登録受付中です。
        </div>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <FadeIn>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-200/60 bg-white/60 px-4 py-1.5 text-[11px] font-semibold text-stone-700 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />EC・小売向けLINE運用プラットフォーム
              </div>
            </FadeIn>
            <TextReveal>
              <h1 className="mb-6 text-[2.2rem] font-extrabold leading-[1.25] tracking-tight md:text-5xl lg:text-[3.2rem]">
                ECのLINE運用で、<br />
                <span className="bg-gradient-to-r from-[#8B7355] to-[#B8A080] bg-clip-text text-transparent">売上を最大化。</span>
              </h1>
              <p className="sr-only">Lオペ for EC（エルオペ フォー EC）はEC・小売向けのLINE公式アカウント運用プラットフォームです。</p>
            </TextReveal>
            <FadeIn delay={0.2}>
              <p className="mb-8 max-w-lg text-[15px] leading-[1.8] text-slate-500">
                カゴ落ち対策・発送通知・顧客CRM・セグメント配信・クーポン管理まで、ECに必要なLINE機能をすべてひとつの管理画面で。売上とリピート率を同時に改善します。
              </p>
            </FadeIn>
            <div className="flex flex-wrap gap-3">
              <PulseGlow>
                <a href="/ec/contact" className="rounded-xl bg-gradient-to-r from-stone-700 to-amber-700 px-8 py-3.5 text-[13px] font-bold text-white shadow-lg shadow-stone-500/20 transition hover:shadow-xl">事前登録はこちら</a>
              </PulseGlow>
              <a href="#features" className="rounded-xl border border-stone-200 bg-white px-8 py-3.5 text-[13px] font-bold text-slate-600 transition hover:border-amber-200 hover:text-amber-700">機能を見る</a>
            </div>
            <StaggerChildren className="mt-10 flex flex-wrap gap-6 text-[11px] text-slate-400">
              {["カゴ落ち率50%改善", "最短3日で導入", "EC特化機能"].map((t) => (
                <StaggerItem key={t}>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-600" />{t}</span>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
          <FadeIn direction="right" delay={0.3}>
            <div className="relative" role="img" aria-label="Lオペ for ECのダッシュボード画面：売上、注文数、カゴ落ち回収を一覧表示">
              <MockWindow title="Lオペ for EC  ダッシュボード">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "今月の売上", val: "¥3.2M", unit: "", bg: "bg-amber-50", text: "text-amber-700" },
                    { label: "注文数", val: "842", unit: "件", bg: "bg-stone-50", text: "text-stone-600" },
                    { label: "カゴ落ち回収", val: "127", unit: "件", bg: "bg-emerald-50", text: "text-emerald-600" },
                    { label: "リピート率", val: "34.8", unit: "%", bg: "bg-violet-50", text: "text-violet-600" },
                  ].map((k) => (
                    <div key={k.label} className={`rounded-lg ${k.bg} p-2.5`}>
                      <div className="text-[11px] text-slate-400">{k.label}</div>
                      <div className={`mt-0.5 text-lg font-bold leading-none ${k.text}`}>{k.val}<span className="text-[10px] font-normal text-slate-400">{k.unit}</span></div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="col-span-2 rounded-lg bg-slate-50 p-3">
                    <div className="mb-2 text-[11px] font-semibold text-slate-500">売上推移（7日間）</div>
                    <div className="flex items-end gap-1" style={{ height: 60 }}>
                      {[45, 52, 48, 65, 58, 72, 80].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#8B7355] to-[#B8A080]" style={{ height: `${h}%` }} />)}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-300"><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <div className="text-[11px] font-semibold text-slate-500">配送状況</div>
                      <div className="mt-1 text-[10px] text-amber-700">発送済 <span className="font-bold">156件</span></div>
                      <div className="text-[10px] text-amber-700">配達完了 <span className="font-bold">89件</span></div>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2.5">
                      <div className="text-[11px] font-semibold text-amber-700">カゴ落ち</div>
                      <div className="mt-1 text-[10px] text-amber-700">回収率 <span className="font-bold">23.4%</span></div>
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
