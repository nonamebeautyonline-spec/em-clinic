"use client";

import { motion } from "motion/react";
import { Section, Label, Title, Sub, ComingSoonBadge } from "./shared";
import { StaggerChildren, StaggerItem, GoldShimmer } from "./animations";

export function Flow() {
  const steps = [
    {
      num: "01",
      title: "無料相談・ヒアリング",
      desc: "お問い合わせフォームから簡単にご相談。ECサイトの課題や目標をヒアリングし、最適なプランをご提案します。",
      icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    },
    {
      num: "02",
      title: "ECカート連携・初期設定",
      desc: "Shopify・BASE・STORES等との連携設定と、カゴ落ち対策・発送通知・配信シナリオのテンプレート構築を代行します。",
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    },
    {
      num: "03",
      title: "運用開始・効果改善",
      desc: "配信・分析・改善のサイクルをスタート。専任担当が売上データをもとに配信戦略の最適化を継続的にサポートします。",
      icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    },
  ];

  return (
    <Section id="flow" className="bg-white">
      <div className="text-center">
        <Label>FLOW</Label>
        <Title>導入の流れ</Title>
        <Sub>最短3日で運用開始。ECカートとの連携設定や配信シナリオの構築はサポートチームが代行します。</Sub>
      </div>
      <ol className="mx-auto max-w-3xl list-none p-0 m-0">
        <StaggerChildren>
          {steps.map((s, i) => (
            <StaggerItem key={s.num}>
              <li className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-amber-600/10 shadow-lg shadow-amber-500/10" aria-hidden="true">
                      <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={s.icon} /></svg>
                    </div>
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">{s.num}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="my-2 h-full w-px bg-gradient-to-b from-amber-500/40 to-transparent" />
                  )}
                </div>
                <div className={i < steps.length - 1 ? "pb-12" : ""}>
                  <h3 className="mb-1.5 text-[16px] font-bold text-slate-900">{s.title}</h3>
                  <p className="text-[13px] leading-relaxed text-slate-500">{s.desc}</p>
                </div>
              </li>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </ol>
      <div className="mt-12 flex justify-center">
        <GoldShimmer className="rounded-full">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-6 py-2.5 text-[12px] font-semibold text-amber-600">
            最短3日で導入完了 / 初期設定代行あり
          </span>

        </GoldShimmer>
      </div>
    </Section>
  );
}
