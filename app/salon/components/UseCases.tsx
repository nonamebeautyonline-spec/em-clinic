"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Section, Label, Title, Sub, ComingSoonBadge } from "./shared";
import { FadeIn, ScaleIn } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   業態別活用事例 — タブ切り替え + ビフォーアフター風表示
   サロン業態ごとの具体的な活用シナリオ
   ═══════════════════════════════════════════════════════════════════════════ */

const useCases = [
  {
    id: "hair",
    industry: "美容室",
    emoji: "✂️",
    color: "from-pink-400 to-rose-400",
    ringColor: "ring-pink-200",
    bgColor: "bg-pink-50",
    before: [
      "予約は電話対応、スタッフの手が止まる",
      "顧客情報が紙カルテでスタッフ間共有できない",
      "再来店促進は何もしていない",
    ],
    after: [
      "LINE予約で電話対応ゼロ。施術者別カレンダーで管理",
      "デジタル顧客カルテで来店履歴・好みをチーム共有",
      "カラー周期に合わせた自動リマインドでリピート率UP",
    ],
    scenarios: ["スタイリスト指名予約", "カラー周期リマインド", "ヘアケアフォロー配信"],
  },
  {
    id: "nail",
    industry: "ネイルサロン",
    emoji: "💅",
    color: "from-violet-400 to-purple-400",
    ringColor: "ring-violet-200",
    bgColor: "bg-violet-50",
    before: [
      "デザインギャラリーの更新が追いつかない",
      "オフ時期のリマインドを忘れがち",
      "新デザイン情報の配信が手動で大変",
    ],
    after: [
      "リッチメニューにギャラリー常設。更新もノーコード",
      "オフ周期に合わせた予約促進を自動配信",
      "好みのデザイン傾向に合わせたセグメント配信",
    ],
    scenarios: ["デザインギャラリー", "オフ周期リマインド", "新デザイン情報配信"],
  },
  {
    id: "esthetics",
    industry: "エステサロン",
    emoji: "🌸",
    color: "from-rose-400 to-fuchsia-400",
    ringColor: "ring-rose-200",
    bgColor: "bg-rose-50",
    before: [
      "コース契約後のフォローが属人的",
      "ホームケア商品の販売機会を逃している",
      "体験来店からの入会率が低い",
    ],
    after: [
      "コース進捗に連動したフォローシナリオを自動配信",
      "LINE物販で施術直後のクロスセルが簡単",
      "体験来店後の入会促進を自動化でCV率向上",
    ],
    scenarios: ["コースフォロー", "ホームケア物販", "入会促進自動化"],
  },
  {
    id: "eyelash",
    industry: "まつげサロン",
    emoji: "👁️",
    color: "from-amber-400 to-orange-400",
    ringColor: "ring-amber-200",
    bgColor: "bg-amber-50",
    before: [
      "リペア時期のリマインドが電話頼み",
      "デザインカタログの共有が不便",
      "リピーターのポイント管理が紙で煩雑",
    ],
    after: [
      "リペア周期に合わせた自動リマインドで来店率UP",
      "リッチメニューにカタログ常設。いつでも閲覧可能",
      "デジタルスタンプカードで紛失ゼロ。特典自動付与",
    ],
    scenarios: ["リペアリマインド", "デザインカタログ", "スタンプカード"],
  },
  {
    id: "hair-removal",
    industry: "脱毛サロン",
    emoji: "✨",
    color: "from-sky-400 to-blue-400",
    ringColor: "ring-sky-200",
    bgColor: "bg-sky-50",
    before: [
      "施術間隔のリマインドが手動で大変",
      "コース進捗の通知ができていない",
      "紹介キャンペーンの運用に手が回らない",
    ],
    after: [
      "施術間隔に合わせた予約リマインドを自動配信",
      "コース進捗を自動通知。残回数もLINEで確認",
      "友だち紹介キャンペーンの発行・計測を完全自動化",
    ],
    scenarios: ["施術間隔リマインド", "コース進捗通知", "紹介キャンペーン"],
  },
];

export default function UseCases() {
  const [activeId, setActiveId] = useState("hair");
  const active = useCases.find((u) => u.id === activeId)!;

  return (
    <Section id="usecases" className="bg-gradient-to-b from-pink-50/30 via-white to-white">
      <div className="text-center">
        <Label>USE CASES</Label>
        <Title>業態別の活用事例</Title>
        <Sub>
          美容室・ネイル・エステ・まつげ・脱毛。あらゆるサロン業態でLINE運用の成果を最大化できます。
        </Sub>
      </div>

      {/* 業態タブ */}
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {useCases.map((uc) => (
          <button
            key={uc.id}
            onClick={() => setActiveId(uc.id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[12px] font-semibold transition-all ${
              activeId === uc.id
                ? `bg-gradient-to-r ${uc.color} text-white shadow-lg`
                : `bg-white text-slate-500 ring-1 ${uc.ringColor} hover:text-pink-600`
            }`}
          >
            <span>{uc.emoji}</span>
            {uc.industry}
          </button>
        ))}
      </div>

      {/* ビフォーアフター */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mx-auto max-w-4xl"
        >
          {/* 業態ヘッダー */}
          <div className="mb-8 text-center">
            <span className="text-4xl">{active.emoji}</span>
            <h3 className="mt-2 text-xl font-extrabold text-slate-800">{active.industry}</h3>
          </div>

          {/* Before / After グリッド */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Before */}
            <ScaleIn>
              <div className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-bold text-slate-600">BEFORE</span>
                  <span className="text-[11px] text-slate-400">導入前の課題</span>
                </div>
                <ul className="space-y-3">
                  {active.before.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate-500">
                      <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[8px] text-slate-500">&#10005;</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </ScaleIn>

            {/* After */}
            <ScaleIn delay={0.15}>
              <div className={`h-full rounded-2xl border border-pink-200 ${active.bgColor} p-6`}>
                <div className="mb-4 flex items-center gap-2">
                  <span className={`rounded-full bg-gradient-to-r ${active.color} px-3 py-1 text-[11px] font-bold text-white`}>AFTER</span>
                  <span className="text-[11px] text-pink-500">Lオペ導入後</span>
                </div>
                <ul className="space-y-3">
                  {active.after.map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate-700">
                      <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pink-500 text-[8px] text-white">&#10003;</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </ScaleIn>
          </div>

          {/* 活用シナリオ */}
          <FadeIn className="mt-6">
            <div className="flex flex-wrap justify-center gap-2">
              {active.scenarios.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-white px-4 py-1.5 text-[12px] font-medium text-slate-600 ring-1 ring-pink-200 transition hover:bg-pink-50 hover:text-pink-600"
                >
                  {s}
                </span>
              ))}
            </div>
          </FadeIn>
        </motion.div>
      </AnimatePresence>
    </Section>
  );
}
