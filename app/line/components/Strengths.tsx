"use client";

import { motion } from "motion/react";
import { Section } from "./shared";
import { SlideIn, FadeIn, CountUp, GradientText } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   Lオペが選ばれる3つの理由 — ダークセクション + LINE緑アクセント
   ═══════════════════════════════════════════════════════════════════════════ */

const cards = [
  {
    num: "01",
    title: "直感的なUI設計",
    sub: "ITに詳しくなくても即戦力",
    stat: { value: 5, suffix: "分", desc: "初回ログインから配信開始まで" },
    points: [
      "ドラッグ&ドロップ操作を中心としたノーコード設計。リッチメニュー・シナリオ・フォームをマウス操作だけで構築可能",
      "チュートリアルやテンプレートが充実しており、はじめてのLINE運用でも迷わない設計",
      "管理画面はスマホ・タブレットにも完全対応。外出先からでも配信状況の確認やメッセージ送信が可能",
    ],
  },
  {
    num: "02",
    title: "圧倒的な低コスト",
    sub: "使用料0円から始められる",
    stat: { value: 0, suffix: "円", desc: "基本利用料・全機能利用可能" },
    points: [
      "月額0円で基本機能をすべて利用可能。友だち数の増加に合わせて段階的にスケールアップ",
      "配信ツール・予約ツール・フォームツール・分析ツールを個別契約すると月5〜15万円。Lオペ for LINEならオールインワンでコストを大幅に削減",
      "メッセージ従量課金のシンプルな体系で、予算管理がしやすく想定外のコスト発生を防止",
    ],
  },
  {
    num: "03",
    title: "手厚いサポート体制",
    sub: "導入から運用まで伴走",
    stat: { value: 3, suffix: "日", desc: "最短導入期間" },
    points: [
      "専任担当者がLINE公式アカウントの初期設定からリッチメニュー構築、配信戦略の立案までサポート",
      "チャットサポートは平日10時〜19時対応。操作方法だけでなく、配信内容の相談や効果改善の提案にも対応",
      "導入事例やベストプラクティスをもとにした運用改善の提案を定期的に実施",
    ],
  },
];

export default function Strengths() {
  return (
    <section id="strengths" className="relative overflow-hidden bg-slate-900 px-5 py-24 text-white md:py-32">
      {/* 背景装飾 */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-[#06C755]/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/[0.03] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <span className="mb-4 inline-block rounded-full bg-[#06C755]/10 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-[#06C755] uppercase">STRENGTHS</span>
          <h2 className="mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-white md:text-4xl">
            Lオペ for LINEが選ばれる<br className="md:hidden" />3つの理由
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-[14px] leading-relaxed text-slate-400">
            直感的なUI、低コスト、手厚いサポート。LINE運用を成功に導くための基盤がLオペ for LINEにはすべて揃っています。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((s, i) => (
            <SlideIn key={s.num} from={i % 2 === 0 ? "left" : "right"} delay={i * 0.1}>
              <motion.div
                className="flex h-full flex-col rounded-2xl border border-slate-700/50 bg-slate-800/40 p-7 backdrop-blur"
                whileHover={{ y: -6, borderColor: "rgba(6, 199, 85, 0.3)" }}
                transition={{ duration: 0.3 }}
              >
                {/* 番号 + 統計 */}
                <div className="mb-5 flex items-start justify-between">
                  <GradientText from="#06C755" to="#4ade80" className="text-4xl font-black">{s.num}</GradientText>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white">
                      <CountUp to={s.stat.value} suffix={s.stat.suffix} />
                    </div>
                    <div className="text-[10px] text-slate-500">{s.stat.desc}</div>
                  </div>
                </div>

                <h3 className="mb-1 text-lg font-bold">{s.title}</h3>
                <p className="mb-5 text-[11px] font-semibold text-[#06C755]">{s.sub}</p>

                <ul className="flex-1 space-y-3">
                  {s.points.map((p, pi) => (
                    <li key={pi} className="flex gap-3 text-[12px] leading-relaxed text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#06C755]/20 text-[8px] text-[#06C755]">&#10003;</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </SlideIn>
          ))}
        </div>
      </div>
    </section>
  );
}
