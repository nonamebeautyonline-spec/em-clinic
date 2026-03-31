"use client";

import { motion } from "motion/react";
import { Section, RoseGoldDivider } from "./shared";
import { FadeIn, SlideIn, CountUp, AnimatedBlob, GlowBorder } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   選ばれる理由 — ローズゴールドアクセントのダークセクション
   カウントアップ数字 + 左右交互レイアウト
   ═══════════════════════════════════════════════════════════════════════════ */

const stats = [
  { label: "リピート率向上", value: 20, suffix: "%", prefix: "+" },
  { label: "予約管理工数", value: 80, suffix: "%", prefix: "-" },
  { label: "導入サロン", value: 0, suffix: "社", prefix: "" },
  { label: "顧客満足度", value: 98, suffix: "%", prefix: "" },
];

const reasons = [
  {
    num: "01",
    title: "サロン業態に特化した設計",
    sub: "汎用ツールでは実現できない専門機能",
    desc: "美容室・ネイル・エステ・まつげ・脱毛など、サロン業態ごとの運用パターンをテンプレート化。スタンプカード・来店履歴・担当スタッフ管理などサロン特有の機能を標準搭載し、導入初日から最適な運用を開始できます。",
    features: ["業態別テンプレート", "スタンプカード標準搭載", "施術者別カレンダー"],
  },
  {
    num: "02",
    title: "リピート率を劇的に改善",
    sub: "データに基づく再来店施策の自動化",
    desc: "来店回数・メニュー・最終来店日に基づくセグメント配信で、一人ひとりに最適なタイミングでアプローチ。デジタルスタンプカード・誕生日クーポン・フォローメッセージの自動配信で、リピート率を平均20%向上させます。",
    features: ["セグメント自動配信", "デジタルスタンプ", "フォロー自動化"],
  },
  {
    num: "03",
    title: "導入も運用もかんたん",
    sub: "ITが苦手でも安心のサポート体制",
    desc: "専任担当者がLINE公式アカウントの設定からリッチメニュー構築、配信シナリオの設計まで代行。管理画面はスマホ・タブレットに完全対応で、施術の合間にも操作できます。",
    features: ["初期設定代行", "スマホ完全対応", "チャットサポート"],
  },
];

export default function Strengths() {
  return (
    <Section id="strengths" className="relative overflow-hidden bg-slate-900 text-white">
      <AnimatedBlob className="-top-40 -right-20" color="bg-pink-500/10" size={400} />
      <AnimatedBlob className="-bottom-40 -left-20" color="bg-rose-500/10" size={400} />

      <div className="text-center">
        <span className="mb-4 inline-block rounded-full bg-gradient-to-r from-pink-500/20 to-rose-500/20 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-pink-400 uppercase ring-1 ring-pink-500/30">
          STRENGTHS
        </span>
        <h2 className="mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-white md:text-4xl">
          Lオペ for SALONが
          <br className="md:hidden" />
          選ばれる3つの理由
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-[14px] leading-relaxed text-slate-400">
          サロン特化の専門設計、リピート率の改善、かんたん導入。
          サロン経営を次のステージへ導く基盤がすべて揃っています。
        </p>
      </div>

      {/* カウントアップ統計 — 準備中のため控えめに表示 */}
      <FadeIn className="mb-16">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black text-transparent bg-gradient-to-r from-pink-400 to-rose-300 bg-clip-text md:text-4xl">
                {s.value === 0 ? (
                  <span className="text-2xl">準備中</span>
                ) : (
                  <CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} />
                )}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* 3つの理由 — 左右交互レイアウト */}
      <div className="space-y-10">
        {reasons.map((r, i) => (
          <SlideIn key={r.num} from={i % 2 === 0 ? "left" : "right"} delay={i * 0.1}>
            <GlowBorder className="mx-auto max-w-4xl">
              <div className="rounded-2xl bg-slate-800/90 p-7 md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                  {/* ナンバー */}
                  <div className="flex shrink-0 items-center gap-4">
                    <motion.div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 text-xl font-black text-white shadow-lg shadow-pink-500/30"
                      whileHover={{ rotate: 5, scale: 1.05 }}
                    >
                      {r.num}
                    </motion.div>
                    <div className="md:hidden">
                      <h3 className="text-lg font-bold text-white">{r.title}</h3>
                      <p className="text-[11px] font-semibold text-pink-400">{r.sub}</p>
                    </div>
                  </div>

                  {/* コンテンツ */}
                  <div className="flex-1">
                    <div className="hidden md:block">
                      <h3 className="text-lg font-bold text-white">{r.title}</h3>
                      <p className="mb-3 text-[11px] font-semibold text-pink-400">{r.sub}</p>
                    </div>
                    <p className="mb-4 text-[13px] leading-relaxed text-slate-300">{r.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {r.features.map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/10 px-3 py-1 text-[11px] font-medium text-pink-300 ring-1 ring-pink-500/20"
                        >
                          <span className="h-1 w-1 rounded-full bg-pink-400" />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GlowBorder>
          </SlideIn>
        ))}
      </div>
    </Section>
  );
}
