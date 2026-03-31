"use client";

import { motion } from "motion/react";
import { Section, Label, Title, RoseGoldDivider } from "./shared";
import { FadeIn, StaggerChildren, StaggerItem, AnimatedBlob } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   お悩みセクション — ビフォーアフター風スライダーUI
   ピンクテーマで課題を視覚的に表現
   ═══════════════════════════════════════════════════════════════════════════ */

const problems = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "予約がバラバラ",
    desc: "電話・ホットペッパー・LINEの予約が別々で、ダブルブッキングや漏れが日常的に発生",
    solution: "LINE予約に一元化。カレンダーで施術者別に管理",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "顧客情報が散在",
    desc: "お客様の来店履歴や好みを把握しきれず、パーソナルな接客ができていない",
    solution: "来店履歴・施術メモ・好みを顧客カルテに集約",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "リピートが伸びない",
    desc: "リピート促進の施策が打てず、新規集客コストばかりかさむ一方",
    solution: "来店周期に合わせた自動配信でリピート率+20%",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "ツール代が高い",
    desc: "予約・CRM・配信・ポイントカード。別々のツールで月額が膨れ上がっている",
    solution: "オールインワンで月額9,800円から",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    title: "紙のポイントカード",
    desc: "デジタル化したいけど何から始めればいいかわからない。紛失や忘れも多い",
    solution: "LINEでデジタルスタンプカード。紛失ゼロ",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "配信の手間",
    desc: "お客様ひとりひとりに合わせたメッセージを送りたいが、手動では時間が足りない",
    solution: "セグメント別の自動配信で手間ゼロ",
  },
];

export default function Problems() {
  return (
    <Section className="relative overflow-hidden">
      <AnimatedBlob className="-top-20 -right-20" color="bg-rose-100/20" size={300} />

      <div className="text-center">
        <Label>PROBLEM</Label>
        <Title>
          サロンのLINE運用で
          <br className="md:hidden" />
          こんなお悩みはありませんか？
        </Title>
      </div>

      <StaggerChildren className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2 lg:grid-cols-3">
        {problems.map((p, i) => (
          <StaggerItem key={i}>
            <motion.div
              className="group relative flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 transition-all hover:border-pink-200 hover:shadow-lg hover:shadow-pink-100/30"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {/* アイコン */}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 text-pink-500 ring-1 ring-pink-100/60 transition group-hover:from-pink-100 group-hover:to-rose-100">
                {p.icon}
              </div>

              {/* 課題 */}
              <h3 className="mb-2 text-[15px] font-bold text-slate-800">{p.title}</h3>
              <p className="mb-4 flex-1 text-[13px] leading-relaxed text-slate-400">{p.desc}</p>

              {/* 解決（ホバーで浮き上がる） */}
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-[12px] font-medium text-emerald-700 opacity-0 transition-all group-hover:opacity-100">
                <span className="mr-1.5 inline-block">&#10132;</span>
                {p.solution}
              </div>
            </motion.div>
          </StaggerItem>
        ))}
      </StaggerChildren>

      <RoseGoldDivider className="mt-14" />

      <FadeIn className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-400 to-fuchsia-400 px-7 py-3 text-[14px] font-bold text-white shadow-lg shadow-pink-500/20">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Lオペ for SALON がすべて解決します
        </div>
      </FadeIn>
    </Section>
  );
}
