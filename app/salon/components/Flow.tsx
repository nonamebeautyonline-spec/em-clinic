"use client";

import { motion } from "motion/react";
import { Section, Label, Title, Sub, RoseGoldDivider, ComingSoonBadge } from "./shared";
import { FadeIn, StaggerChildren, StaggerItem, AnimatedBlob } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   導入フロー — ピンクのステップタイムライン
   花柄装飾 + ソフトシェイプ背景
   ═══════════════════════════════════════════════════════════════════════════ */

const steps = [
  {
    num: "01",
    title: "無料相談・ヒアリング",
    desc: "サロンの業態・規模・課題をヒアリング。最適なプランと活用方法をご提案します。LINE公式アカウント未開設の場合は開設も代行。",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    duration: "所要時間 約30分",
  },
  {
    num: "02",
    title: "初期設定・構築",
    desc: "リッチメニュー・スタンプカード・配信シナリオなどをサロンに合わせて構築。テンプレートとサポートチームの代行で負担はほぼゼロ。",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    duration: "最短3日",
  },
  {
    num: "03",
    title: "運用開始・改善サポート",
    desc: "予約管理・顧客管理・配信・物販をスタート。操作に困ったらチャットサポートがすぐに対応。リピート率改善の提案も定期的に実施します。",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    duration: "継続的にサポート",
  },
];

export function Flow() {
  return (
    <Section id="flow" className="relative overflow-hidden">
      <AnimatedBlob className="-bottom-30 -right-20" color="bg-pink-100/20" size={300} />

      <div className="text-center">
        <Label>FLOW</Label>
        <Title>導入の流れ</Title>
        <Sub>最短3日で運用開始。初期設定はサポートチームが代行するため、現場の負担はほぼゼロです。</Sub>
      </div>

      <ol className="mx-auto max-w-3xl list-none p-0 m-0">
        <StaggerChildren>
          {steps.map((s, i) => (
            <StaggerItem key={s.num}>
              <li className="flex gap-5 md:gap-7">
                {/* タイムライン */}
                <div className="flex flex-col items-center">
                  <motion.div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-rose-400 to-fuchsia-400 text-[14px] font-black text-white shadow-lg shadow-pink-500/25"
                    whileHover={{ rotate: 5, scale: 1.05 }}
                    aria-hidden="true"
                  >
                    {s.num}
                  </motion.div>
                  {i < steps.length - 1 && (
                    <div className="my-2 h-full w-px bg-gradient-to-b from-pink-300 to-pink-100" />
                  )}
                </div>

                {/* コンテンツ */}
                <div className={i < steps.length - 1 ? "pb-10" : ""}>
                  <div className="flex items-center gap-3">
                    <h3 className="text-[16px] font-bold text-slate-800">{s.title}</h3>
                    <span className="rounded-full bg-pink-50 px-2.5 py-0.5 text-[10px] font-semibold text-pink-600 ring-1 ring-pink-100">
                      {s.duration}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{s.desc}</p>

                  {/* ステップのアイコン装飾 */}
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-50 to-rose-50 px-3 py-1.5 ring-1 ring-pink-100/60">
                    <svg className="h-4 w-4 text-pink-500" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d={s.icon} />
                    </svg>
                    <span className="text-[10px] font-medium text-pink-600">
                      {i === 0 ? "オンラインまたは対面でご相談" : i === 1 ? "サポートチームが構築代行" : "データに基づく改善提案"}
                    </span>
                  </div>
                </div>
              </li>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </ol>

      <RoseGoldDivider className="mt-14" />

      <FadeIn className="mt-8 text-center">
        <div className="inline-flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
          <span className="inline-block rounded-full border border-pink-200 bg-gradient-to-r from-pink-50 to-rose-50 px-6 py-2.5 text-[13px] font-semibold text-pink-700 shadow-sm">
            最短3日で導入完了 / 初期設定代行あり
          </span>
          <ComingSoonBadge />
        </div>
      </FadeIn>
    </Section>
  );
}
