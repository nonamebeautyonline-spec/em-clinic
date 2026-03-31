"use client";

import { motion } from "motion/react";
import { MockWindow, ComingSoonBadge } from "./shared";
import { AnimatedBlob, TextReveal, FadeIn, StaggerChildren, StaggerItem, PulseGlow, FloatingPetals, Shimmer } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   ヒーローセクション — サロン特化デザイン
   予約管理画面のモック（施術者ごとのカレンダー）
   ピンク＋ローズゴールドの華やかなデザイン
   ═══════════════════════════════════════════════════════════════════════════ */

const stylists = [
  { name: "田中 美咲", color: "bg-pink-400", slots: [1, 2, 0, 1, 2, 1, 0] },
  { name: "鈴木 優花", color: "bg-rose-400", slots: [2, 0, 1, 2, 1, 0, 2] },
  { name: "佐藤 凛", color: "bg-fuchsia-400", slots: [0, 1, 2, 0, 1, 2, 1] },
];

/* 0=空き, 1=予約済み, 2=施術中 */
const slotStyles = [
  "bg-emerald-50 border-emerald-200 text-emerald-600",
  "bg-pink-50 border-pink-200 text-pink-600",
  "bg-amber-50 border-amber-200 text-amber-600",
];
const slotLabels = ["空き", "予約済", "施術中"];
const timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* 背景グラデーション */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50/90 via-white to-rose-50/60" />

      {/* 花びらパーティクル */}
      <FloatingPetals count={8} />

      {/* 浮遊Blob */}
      <AnimatedBlob className="-top-40 right-0" color="bg-pink-200/30" size={500} />
      <AnimatedBlob className="-bottom-60 -left-40" color="bg-rose-200/20" size={600} />
      <AnimatedBlob className="top-1/2 left-1/3" color="bg-fuchsia-100/20" size={300} />

      <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-20 md:pt-24 md:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* 左カラム: テキスト */}
          <div>
            <FadeIn>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-pink-200/60 bg-white/70 px-4 py-1.5 text-[11px] font-semibold text-pink-700 shadow-sm backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                  サロン特化LINE運用プラットフォーム
                </div>
                <ComingSoonBadge />
              </div>
            </FadeIn>
            <TextReveal>
              <h1 className="mb-6 text-[2.2rem] font-extrabold leading-[1.25] tracking-tight md:text-5xl lg:text-[3.2rem]">
                サロンのLINE運用を、
                <br />
                <span className="bg-gradient-to-r from-pink-500 via-rose-400 to-fuchsia-400 bg-clip-text text-transparent">
                  ひとつに。
                </span>
              </h1>
              <p className="sr-only">
                Lオペ for SALON（エルオペ フォー サロン）は美容室・ネイル・エステ等のサロン向けLINE公式アカウント運用プラットフォームです。
              </p>
            </TextReveal>
            <FadeIn delay={0.2}>
              <p className="mb-8 max-w-lg text-[15px] leading-[1.8] text-slate-500">
                予約管理・顧客カルテ・セグメント配信・リッチメニュー・スタンプカード・物販まで。
                サロン経営に必要な全てをLINE公式アカウント起点でワンストップ提供します。
              </p>
            </FadeIn>
            <div className="flex flex-wrap gap-3">
              <PulseGlow>
                <a
                  href="/salon/contact"
                  className="rounded-xl bg-gradient-to-r from-pink-500 via-rose-400 to-fuchsia-400 px-8 py-3.5 text-[13px] font-bold text-white shadow-lg shadow-pink-500/25 transition hover:shadow-xl"
                >
                  事前登録はこちら
                </a>
              </PulseGlow>
              <a
                href="#features"
                className="rounded-xl border border-pink-200 bg-white/80 px-8 py-3.5 text-[13px] font-bold text-slate-600 backdrop-blur transition hover:border-pink-300 hover:text-pink-600"
              >
                機能を見る
              </a>
            </div>
            <StaggerChildren className="mt-10 flex flex-wrap gap-6 text-[11px] text-slate-400">
              {["月額9,800円から", "最短3日で導入", "全サロン業態対応"].map((t) => (
                <StaggerItem key={t}>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-pink-400 to-rose-400" />
                    {t}
                  </span>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>

          {/* 右カラム: 予約カレンダーモック */}
          <FadeIn direction="right" delay={0.3}>
            <div
              className="relative"
              role="img"
              aria-label="Lオペ for SALONの予約管理画面：施術者ごとのカレンダー表示で予約状況を一覧管理"
            >
              <MockWindow title="Lオペ for SALON  予約カレンダー">
                {/* KPIカード */}
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {[
                    { label: "本日の予約", val: "18", unit: "件", bg: "bg-pink-50", text: "text-pink-600" },
                    { label: "LINE顧客数", val: "3,820", unit: "人", bg: "bg-rose-50", text: "text-rose-600" },
                    { label: "リピート率", val: "78.4", unit: "%", bg: "bg-fuchsia-50", text: "text-fuchsia-600" },
                  ].map((k) => (
                    <div key={k.label} className={`rounded-lg ${k.bg} p-2`}>
                      <div className="text-[10px] text-slate-400">{k.label}</div>
                      <div className={`mt-0.5 text-base font-bold leading-none ${k.text}`}>
                        {k.val}
                        <span className="text-[9px] font-normal text-slate-400">{k.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* カレンダーグリッド */}
                <div className="rounded-lg border border-pink-100/60 bg-pink-50/30 p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">2026年4月 施術者別予約</span>
                    <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[9px] font-bold text-pink-600">今日</span>
                  </div>
                  {/* ヘッダー行 */}
                  <div className="mb-1 grid grid-cols-8 gap-1">
                    <div className="text-[9px] text-slate-400" />
                    {timeSlots.map((t) => (
                      <div key={t} className="text-center text-[8px] font-medium text-slate-400">
                        {t}
                      </div>
                    ))}
                  </div>
                  {/* スタイリスト行 */}
                  {stylists.map((s) => (
                    <div key={s.name} className="mb-1 grid grid-cols-8 items-center gap-1">
                      <div className="flex items-center gap-1 truncate">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${s.color}`} />
                        <span className="truncate text-[8px] font-medium text-slate-600">{s.name}</span>
                      </div>
                      {s.slots.map((slot, si) => (
                        <div
                          key={si}
                          className={`rounded border py-0.5 text-center text-[7px] font-bold ${slotStyles[slot]}`}
                        >
                          {slotLabels[slot]}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* 凡例 */}
                <div className="mt-2 flex gap-3 text-[8px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-300" />空き</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-300" />予約済</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-300" />施術中</span>
                </div>
              </MockWindow>

              {/* フローティングカード */}
              <Shimmer className="absolute right-1 -bottom-4 rounded-xl border border-pink-100 bg-white px-4 py-2.5 shadow-lg shadow-pink-100/40 md:-right-6 md:-bottom-5">
                <div className="text-[11px] text-slate-400">来店リマインド</div>
                <div className="text-[13px] font-bold text-pink-600">12件 自動配信済</div>
              </Shimmer>

              <motion.div
                className="absolute -top-3 left-2 rounded-xl border border-rose-100 bg-white px-3 py-2 shadow-lg shadow-rose-100/30 md:-top-4 md:left-0"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="text-[10px] text-slate-400">スタンプカード利用</div>
                <div className="text-[12px] font-bold text-rose-600">1,847人</div>
              </motion.div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
