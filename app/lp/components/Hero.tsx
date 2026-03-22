"use client";

import { MockWindow } from "./shared";
import { AnimatedBlob, TextReveal, FadeIn, StaggerChildren, StaggerItem, PulseGlow } from "./animations";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50" />
      {/* 背景blobを浮遊アニメーション化 */}
      <AnimatedBlob className="-top-40 right-0" color="bg-blue-100/40" size={500} />
      <AnimatedBlob className="-bottom-60 -left-40" color="bg-sky-100/30" size={600} />
      <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-20 md:pt-24 md:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <FadeIn>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-white/60 px-4 py-1.5 text-[11px] font-semibold text-blue-700 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />LINE公式アカウント × クリニック特化プラットフォーム
              </div>
            </FadeIn>
            <TextReveal>
              <h1 className="mb-6 text-[2.2rem] font-extrabold leading-[1.25] tracking-tight md:text-5xl lg:text-[3.2rem]">
                <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">Lオペ for CLINIC</span><br />LINE公式アカウントで<br />クリニック業務をまるごとDX化
              </h1>
              <p className="sr-only">Lオペ（エルオペ）はクリニック経営に特化したLINE運用プラットフォームです。</p>
            </TextReveal>
            <FadeIn delay={0.2}>
              <p className="mb-8 max-w-lg text-[15px] leading-[1.8] text-slate-500">
                Lオペ for CLINIC なら、患者CRM・セグメント配信・リッチメニュー構築・問診・予約管理・会計・配送・AI自動返信まで。LINE公式アカウントを起点にクリニック運営のすべてをワンストップで実現します。
              </p>
            </FadeIn>
            <div className="flex flex-wrap gap-3">
              <PulseGlow>
                <a href="/lp/contact" className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-8 py-3.5 text-[13px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl">無料で資料請求</a>
              </PulseGlow>
              <a href="#features" className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-[13px] font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-600">機能を見る</a>
            </div>
            <StaggerChildren className="mt-10 flex flex-wrap gap-6 text-[11px] text-slate-400">
              {["初期設定サポート無料", "最短2週間で導入", "専任スタッフが伴走"].map((t) => (
                <StaggerItem key={t}>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" />{t}</span>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
          <FadeIn direction="right" delay={0.3}>
            <div className="relative" role="img" aria-label="Lオペ for CLINICのダッシュボード画面：予約管理、LINE友だち数推移、月間売上、リピート率、対応状況、配信結果を一覧表示">
              <MockWindow title="Lオペ for CLINIC — ダッシュボード">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "本日の予約", val: "24", unit: "件", bg: "bg-blue-50", text: "text-blue-600" },
                    { label: "LINE友だち", val: "1,847", unit: "人", bg: "bg-sky-50", text: "text-sky-600" },
                    { label: "月間売上", val: "3.2", unit: "M", bg: "bg-amber-50", text: "text-amber-600" },
                    { label: "リピート率", val: "68", unit: "%", bg: "bg-violet-50", text: "text-violet-600" },
                  ].map((k) => (
                    <div key={k.label} className={`rounded-lg ${k.bg} p-2.5`}>
                      <div className="text-[11px] text-slate-400">{k.label}</div>
                      <div className={`mt-0.5 text-lg font-bold leading-none ${k.text}`}>{k.val}<span className="text-[10px] font-normal text-slate-400">{k.unit}</span></div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="col-span-2 rounded-lg bg-slate-50 p-3">
                    <div className="mb-2 text-[11px] font-semibold text-slate-500">LINE友だち推移（7日間）</div>
                    <div className="flex items-end gap-1" style={{ height: 60 }}>
                      {[35, 42, 38, 55, 48, 62, 70].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-400 to-sky-300" style={{ height: `${h}%` }} />)}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-300"><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <div className="text-[11px] font-semibold text-slate-500">対応状況</div>
                      <div className="mt-1.5 space-y-1">
                        {[{ c: "bg-red-400", l: "未対応", n: 3 }, { c: "bg-amber-400", l: "対応中", n: 7 }, { c: "bg-blue-400", l: "完了", n: 18 }].map((s) => (
                          <div key={s.l} className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className={`h-2 w-2 rounded-full ${s.c}`} />{s.l}<span className="ml-auto font-bold">{s.n}</span></div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-2.5">
                      <div className="text-[11px] font-semibold text-blue-600">配信結果</div>
                      <div className="mt-1 text-[10px] text-blue-700">開封率 <span className="font-bold">78.3%</span></div>
                      <div className="text-[10px] text-blue-700">予約CV <span className="font-bold">12.1%</span></div>
                    </div>
                  </div>
                </div>
              </MockWindow>
              <div className="absolute right-2 -bottom-3 rounded-xl border border-blue-100 bg-white px-4 py-2.5 shadow-lg shadow-blue-100/40 md:-right-6 md:-bottom-5">
                <div className="text-[11px] text-slate-400">リマインド自動配信</div>
                <div className="text-[13px] font-bold text-blue-600">24件 送信完了</div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* 成果数字 — 実績蓄積後に復活 */}
      </div>
    </section>
  );
}
