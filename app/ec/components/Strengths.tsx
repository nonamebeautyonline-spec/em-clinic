"use client";

import { motion } from "motion/react";
import { Section } from "./shared";
import { SlideIn, GoldShimmer, CountUp } from "./animations";

export default function Strengths() {
  const cards = [
    {
      num: "01",
      title: "EC特化の設計思想",
      sub: "汎用ツールにはない購買データ連携",
      icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
      stat: { val: 15, unit: "%", label: "カゴ落ち回収率" },
      points: [
        "購買履歴・カート情報・配送ステータスとLINEを自動連携",
        "RFM分析・LTV予測に基づくセグメント配信で売上直結",
        "カゴ落ち通知・レビュー依頼・再購入リマインドを標準搭載",
      ],
    },
    {
      num: "02",
      title: "導入から成果まで最短距離",
      sub: "複雑な設定不要で即日運用開始",
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
      stat: { val: 3, unit: "日", label: "最短導入期間" },
      points: [
        "主要ECカート（Shopify・BASE・STORES等）とワンクリック連携",
        "業態別テンプレートで自動配信シナリオが即座に稼働",
        "設定代行サポートで現場の負担をほぼゼロに",
      ],
    },
    {
      num: "03",
      title: "売上貢献を可視化",
      sub: "投資対効果がひと目でわかる",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      stat: { val: 340, unit: "%", label: "平均ROI" },
      points: [
        "LINE経由の売上・注文数・客単価をリアルタイムで計測",
        "クーポン利用率・回収金額・リピート率の推移をグラフ化",
        "月次レポートの自動生成で会議準備工数を削減",
      ],
    },
  ];

  return (
    <Section id="strengths" className="bg-[#0f3460]/20 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#1a1a2e]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,134,11,0.05),transparent_70%)]" />

      <div className="relative">
        <div className="text-center">
          <span className="mb-4 inline-block rounded-full bg-amber-500/10 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-amber-400 uppercase">STRENGTHS</span>
          <h2 className="mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-white md:text-4xl">Lオペ for ECが選ばれる<br className="md:hidden" />3つの理由</h2>
          <p className="mx-auto mb-16 max-w-2xl text-[14px] leading-relaxed text-slate-400">EC特化設計、かんたん導入、売上可視化。LINE運用でEC売上を最大化するための基盤がすべて揃っています。</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((s, i) => (
            <SlideIn key={s.num} from={i % 2 === 0 ? "left" : "right"} delay={i * 0.1}>
              <GoldShimmer className="h-full">
                <div className="flex h-full flex-col rounded-2xl border border-slate-700/50 bg-slate-800/40 p-7 backdrop-blur">
                  {/* アイコン + 番号 */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                      <svg className="h-6 w-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={s.icon} /></svg>
                    </div>
                    <div className="bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-3xl font-black text-transparent">{s.num}</div>
                  </div>

                  <h3 className="mb-1 text-lg font-bold text-white">{s.title}</h3>
                  <p className="mb-4 text-[11px] font-semibold text-amber-400">{s.sub}</p>

                  {/* 統計ハイライト */}
                  <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                    <CountUp to={s.stat.val} className="text-3xl font-black text-amber-400" suffix={s.stat.unit} />
                    <div className="mt-0.5 text-[10px] text-slate-500">{s.stat.label}</div>
                  </div>

                  <ul className="flex-1 space-y-3">
                    {s.points.map((p, pi) => (
                      <li key={pi} className="flex gap-3 text-[12px] leading-relaxed text-slate-300">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[8px] text-amber-400">&#10003;</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </GoldShimmer>
            </SlideIn>
          ))}
        </div>
      </div>
    </Section>
  );
}
