"use client";

import { MockWindow } from "./shared";
import { AnimatedBlob, TextReveal, FadeIn, StaggerChildren, StaggerItem, PulseGlow } from "./animations";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-white to-green-50/50" />
      <AnimatedBlob className="-top-40 right-0" color="bg-emerald-100/40" size={500} />
      <AnimatedBlob className="-bottom-60 -left-40" color="bg-green-100/30" size={600} />
      <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-20 md:pt-24 md:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <FadeIn>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-white/60 px-4 py-1.5 text-[11px] font-semibold text-emerald-700 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[#06C755]" />LINE公式アカウント運用プラットフォーム
              </div>
            </FadeIn>
            <TextReveal>
              <h1 className="mb-6 text-[2.2rem] font-extrabold leading-[1.25] tracking-tight md:text-5xl lg:text-[3.2rem]">
                LINE公式アカウント運用を、<br />
                <span className="bg-gradient-to-r from-[#06C755] to-emerald-500 bg-clip-text text-transparent">もっとシンプルに。</span>
              </h1>
              <p className="sr-only">Lオペ（エルオペ）はLINE公式アカウントの運用をオールインワンで効率化するプラットフォームです。</p>
            </TextReveal>
            <FadeIn delay={0.2}>
              <p className="mb-8 max-w-lg text-[15px] leading-[1.8] text-slate-500">
                使用料0円、メッセージ従量課金のシンプルな料金体系。セグメント配信・シナリオ配信・リッチメニュー・フォーム・分析ダッシュボードまで、必要な機能をすべてひとつの管理画面で。
              </p>
            </FadeIn>
            <div className="flex flex-wrap gap-3">
              <PulseGlow>
                <a href="/line/contact" className="rounded-xl bg-gradient-to-r from-[#06C755] to-emerald-500 px-8 py-3.5 text-[13px] font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-xl">無料で始める</a>
              </PulseGlow>
              <a href="#features" className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-[13px] font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-600">機能を見る</a>
            </div>
            <StaggerChildren className="mt-10 flex flex-wrap gap-6 text-[11px] text-slate-400">
              {["使用料0円・従量課金", "最短3日で導入", "全業種対応"].map((t) => (
                <StaggerItem key={t}>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#06C755]" />{t}</span>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
          <FadeIn direction="right" delay={0.3}>
            <div className="relative" role="img" aria-label="Lオペのダッシュボード画面：配信数、友だち数、開封率を一覧表示">
              <MockWindow title="Lオペ  ダッシュボード">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "今月の配信", val: "12,480", unit: "通", bg: "bg-emerald-50", text: "text-emerald-600" },
                    { label: "友だち数", val: "5,230", unit: "人", bg: "bg-green-50", text: "text-green-600" },
                    { label: "開封率", val: "82.1", unit: "%", bg: "bg-amber-50", text: "text-amber-600" },
                    { label: "クリック率", val: "24.5", unit: "%", bg: "bg-violet-50", text: "text-violet-600" },
                  ].map((k) => (
                    <div key={k.label} className={`rounded-lg ${k.bg} p-2.5`}>
                      <div className="text-[11px] text-slate-400">{k.label}</div>
                      <div className={`mt-0.5 text-lg font-bold leading-none ${k.text}`}>{k.val}<span className="text-[10px] font-normal text-slate-400">{k.unit}</span></div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="col-span-2 rounded-lg bg-slate-50 p-3">
                    <div className="mb-2 text-[11px] font-semibold text-slate-500">友だち推移（7日間）</div>
                    <div className="flex items-end gap-1" style={{ height: 60 }}>
                      {[35, 42, 38, 55, 48, 62, 70].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#06C755] to-emerald-300" style={{ height: `${h}%` }} />)}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-300"><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <div className="text-[11px] font-semibold text-slate-500">配信結果</div>
                      <div className="mt-1 text-[10px] text-emerald-700">開封率 <span className="font-bold">82.1%</span></div>
                      <div className="text-[10px] text-emerald-700">クリック率 <span className="font-bold">24.5%</span></div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2.5">
                      <div className="text-[11px] font-semibold text-emerald-600">セグメント</div>
                      <div className="mt-1 text-[10px] text-emerald-700">配信対象 <span className="font-bold">1,247人</span></div>
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
