"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { MockPhone, LineChatHeader } from "./shared";
import { AnimatedBlob, TextReveal, FadeIn, StaggerChildren, StaggerItem, PulseGlow, FloatingLineIcons, GradientText, MessageBubble } from "./animations";

/* ──── LINE風チャット画面モックアップ ──── */
function MockChatWindow() {
  const messages: { text: string; from: "me" | "other"; delay: number }[] = [
    { text: "明日の予約をリマインドしてほしいのですが", from: "me", delay: 0.3 },
    { text: "明日のご予約ですね。14:00からのお予約を確認いたしました。前日リマインドを設定しました。", from: "other", delay: 1.5 },
    { text: "ありがとう！クーポンはありますか？", from: "me", delay: 3.0 },
    { text: "今月限定の20%OFFクーポンがございます。ご利用されますか？", from: "other", delay: 4.2 },
  ];

  return (
    <MockPhone>
      <LineChatHeader name="ショップ公式" />
      <div className="bg-[#7DBBAB]/15 px-3 py-4" style={{ minHeight: 340 }}>
        <div className="mb-3 text-center text-[10px] text-slate-400">14:32</div>
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <MessageBubble key={i} text={msg.text} from={msg.from} delay={msg.delay} />
          ))}
        </div>
      </div>
      {/* 入力欄 */}
      <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#06C755]">
          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
        </div>
        <div className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-[11px] text-slate-300">メッセージを入力</div>
        <svg className="h-5 w-5 text-[#06C755]" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
      </div>
    </MockPhone>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* 背景: グリーン系グラデーションメッシュ */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#06C755]/5 via-white to-emerald-50/60" />
        <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-[#06C755]/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-emerald-400/[0.06] blur-[100px]" />
      </div>
      <FloatingLineIcons />
      <AnimatedBlob className="-top-40 right-0" color="bg-[#06C755]/10" size={500} />
      <AnimatedBlob className="-bottom-60 -left-40" color="bg-emerald-200/20" size={600} />

      <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-20 md:pt-28 md:pb-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* 左: テキストコンテンツ */}
          <div>
            <FadeIn>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#06C755]/20 bg-white/70 px-4 py-1.5 text-[11px] font-semibold text-[#06C755] backdrop-blur">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="#06C755"><path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.93 1.95 5.5 4.86 7.08-.17.62-.64 2.3-.73 2.65-.12.46.17.45.35.33.14-.1 2.19-1.47 3.08-2.07.47.07.95.11 1.44.11 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" /></svg>
                LINE公式アカウント運用プラットフォーム
              </div>
            </FadeIn>
            <TextReveal>
              <h1 className="mb-6 text-[2.2rem] font-extrabold leading-[1.2] tracking-tight md:text-5xl lg:text-[3.4rem]">
                LINE運用を、<br />
                <GradientText from="#06C755" to="#00B900" className="font-extrabold">もっとシンプルに。</GradientText>
              </h1>
              <p className="sr-only">Lオペ（エルオペ）はLINE公式アカウントの運用をオールインワンで効率化するプラットフォームです。</p>
            </TextReveal>

            {/* 使用料0円の大きな強調 */}
            <FadeIn delay={0.15}>
              <div className="mb-6 inline-flex items-baseline gap-2 rounded-2xl border-2 border-[#06C755]/20 bg-[#06C755]/5 px-6 py-3">
                <span className="text-[13px] font-bold text-slate-600">使用料</span>
                <span className="text-5xl font-black text-[#06C755] md:text-6xl">0</span>
                <span className="text-xl font-bold text-[#06C755]">円</span>
                <span className="ml-1 rounded-full bg-[#06C755] px-2.5 py-0.5 text-[10px] font-bold text-white">従量課金のみ</span>
              </div>
            </FadeIn>

            <FadeIn delay={0.25}>
              <p className="mb-8 max-w-lg text-[15px] leading-[1.8] text-slate-500">
                セグメント配信・シナリオ配信・リッチメニュー構築・フォーム・分析ダッシュボードまで。必要な機能をすべて、ひとつの管理画面で。
              </p>
            </FadeIn>

            <div className="flex flex-wrap gap-3">
              <PulseGlow>
                <a href="/line/contact" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#06C755] to-[#00B900] px-8 py-3.5 text-[13px] font-bold text-white shadow-lg shadow-[#06C755]/25 transition hover:shadow-xl">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.93 1.95 5.5 4.86 7.08-.17.62-.64 2.3-.73 2.65-.12.46.17.45.35.33.14-.1 2.19-1.47 3.08-2.07.47.07.95.11 1.44.11 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" /></svg>
                  無料で始める
                </a>
              </PulseGlow>
              <a href="#features" className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-[13px] font-bold text-slate-600 transition hover:border-[#06C755]/30 hover:text-[#06C755]">機能を見る</a>
            </div>

            <StaggerChildren className="mt-10 flex flex-wrap gap-6 text-[11px] text-slate-400">
              {["使用料0円・従量課金", "最短3日で導入", "全業種対応"].map((t) => (
                <StaggerItem key={t}>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#06C755]" />{t}</span>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>

          {/* 右: チャット画面モック */}
          <FadeIn direction="right" delay={0.3}>
            <div className="relative flex justify-center" role="img" aria-label="LINEトーク画面風のデモ: 自動リマインドやクーポン配信の会話例">
              <MockChatWindow />
              {/* フローティングバッジ */}
              <motion.div
                className="absolute -right-2 top-16 rounded-xl border border-[#06C755]/20 bg-white px-4 py-2.5 shadow-lg shadow-emerald-100/40 md:-right-8"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="text-[10px] text-slate-400">開封率</div>
                <div className="text-[16px] font-black text-[#06C755]">82.1%</div>
              </motion.div>
              <motion.div
                className="absolute -left-2 bottom-24 rounded-xl border border-emerald-100 bg-white px-4 py-2.5 shadow-lg shadow-emerald-100/40 md:-left-8"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <div className="text-[10px] text-slate-400">自動配信完了</div>
                <div className="text-[13px] font-bold text-[#06C755]">1,247通 送信済</div>
              </motion.div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
