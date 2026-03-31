"use client";

import { DashboardPanel, ComingSoonBadge } from "./shared";
import { AnimatedBlob, TextReveal, FadeIn, StaggerChildren, StaggerItem, PulseGlow, SalesCounter, CountUp, GoldShimmer } from "./animations";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#1a1a2e]">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(184,134,11,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(196,164,109,0.06),transparent_60%)]" />
      <AnimatedBlob className="-top-40 right-0" color="bg-amber-500/8" size={600} />
      <AnimatedBlob className="-bottom-60 -left-40" color="bg-[#B8860B]/6" size={500} />

      <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-20 md:pt-24 md:pb-28">
        {/* Coming Soonバナー */}
        <FadeIn>
          <div className="mb-8 flex items-center justify-center">
            <GoldShimmer className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-amber-400/10 to-amber-500/5 px-6 py-3.5 backdrop-blur">
              <div className="flex items-center gap-3">
                <ComingSoonBadge size="small" />
                <span className="text-[13px] font-semibold text-amber-300/90">2026年夏リリース予定 &mdash; 事前登録受付中</span>
              </div>
            </GoldShimmer>
          </div>
        </FadeIn>

        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <FadeIn>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-white/5 px-4 py-1.5 text-[11px] font-semibold text-amber-300 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />EC・小売向けLINE運用プラットフォーム
              </div>
            </FadeIn>
            <TextReveal>
              <h1 className="mb-6 text-[2.2rem] font-extrabold leading-[1.25] tracking-tight text-white md:text-5xl lg:text-[3.2rem]">
                ECのLINE運用で、<br />
                <span className="bg-gradient-to-r from-[#B8860B] via-[#C4A46D] to-[#DAA520] bg-clip-text text-transparent">売上を最大化。</span>
              </h1>
              <p className="sr-only">Lオペ for EC（エルオペ フォー EC）はEC・小売向けのLINE公式アカウント運用プラットフォームです。</p>
            </TextReveal>
            <FadeIn delay={0.2}>
              <p className="mb-8 max-w-lg text-[15px] leading-[1.8] text-slate-400">
                カゴ落ち対策・発送通知・顧客CRM・セグメント配信・クーポン管理まで、ECに必要なLINE機能をすべてひとつの管理画面で。売上とリピート率を同時に改善します。
              </p>
            </FadeIn>
            <div className="flex flex-wrap gap-3">
              <PulseGlow>
                <a href="/ec/contact" className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3.5 text-[13px] font-bold text-white shadow-lg shadow-amber-500/20 transition hover:shadow-xl hover:shadow-amber-500/30">事前登録はこちら</a>
              </PulseGlow>
              <a href="#features" className="rounded-xl border border-slate-600 bg-white/5 px-8 py-3.5 text-[13px] font-bold text-slate-300 backdrop-blur transition hover:border-amber-500/40 hover:text-amber-400">機能を見る</a>
            </div>
            <StaggerChildren className="mt-10 flex flex-wrap gap-6 text-[11px] text-slate-500">
              {["カゴ落ち率50%改善", "最短3日で導入", "EC特化機能"].map((t) => (
                <StaggerItem key={t}>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{t}</span>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>

          {/* ダッシュボードモック */}
          <FadeIn direction="right" delay={0.3}>
            <div className="relative" role="img" aria-label="Lオペ for ECのダッシュボード画面：売上、注文数、カゴ落ち回収率、配送完了率を一覧表示">
              <DashboardPanel title="Lオペ for EC — ダッシュボード">
                {/* KPI カード群 */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "今月の売上", val: "3.2", unit: "M", icon: "text-amber-400", bg: "bg-amber-500/10" },
                    { label: "注文数", val: "842", unit: "件", icon: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "カゴ落ち回収", val: "23.4", unit: "%", icon: "text-sky-400", bg: "bg-sky-500/10" },
                    { label: "配送完了率", val: "97.2", unit: "%", icon: "text-violet-400", bg: "bg-violet-500/10" },
                  ].map((k) => (
                    <div key={k.label} className={`rounded-lg ${k.bg} p-2.5`}>
                      <div className="text-[10px] text-slate-500">{k.label}</div>
                      <div className={`mt-0.5 text-lg font-bold leading-none ${k.icon}`}>
                        {k.label === "今月の売上" ? "¥" : ""}{k.val}<span className="text-[10px] font-normal text-slate-500">{k.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 売上グラフ + 配送状況 */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="col-span-2 rounded-lg bg-slate-900/50 p-3">
                    <div className="mb-2 text-[10px] font-semibold text-slate-500">売上推移（7日間）</div>
                    <div className="flex items-end gap-1" style={{ height: 60 }}>
                      {[45, 52, 48, 65, 58, 72, 80].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-amber-600 to-amber-400" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[9px] text-slate-600"><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-slate-900/50 p-2.5">
                      <div className="text-[10px] font-semibold text-slate-500">配送状況</div>
                      <div className="mt-1.5 space-y-1">
                        {[
                          { c: "bg-amber-400", l: "発送準備", n: 24 },
                          { c: "bg-sky-400", l: "配送中", n: 156 },
                          { c: "bg-emerald-400", l: "配達完了", n: 89 },
                        ].map((s) => (
                          <div key={s.l} className="flex items-center gap-1.5 text-[9px] text-slate-400">
                            <span className={`h-1.5 w-1.5 rounded-full ${s.c}`} />{s.l}<span className="ml-auto font-bold text-slate-300">{s.n}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg bg-amber-500/10 p-2.5">
                      <div className="text-[10px] font-semibold text-amber-400">カゴ落ち</div>
                      <div className="mt-1 text-[9px] text-amber-300">回収率 <span className="font-bold">23.4%</span></div>
                      <div className="text-[9px] text-amber-300">回収額 <span className="font-bold">¥847K</span></div>
                    </div>
                  </div>
                </div>
              </DashboardPanel>

              {/* フローティングカード: リアルタイム売上 */}
              <div className="absolute right-2 -bottom-4 rounded-xl border border-amber-500/20 bg-slate-900/90 px-4 py-3 shadow-lg shadow-black/30 backdrop-blur md:-right-6 md:-bottom-6">
                <SalesCounter />
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
