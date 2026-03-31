"use client";

import { motion } from "motion/react";
import { Section, Label, Title, Sub } from "./shared";
import { FadeIn, StaggerChildren, StaggerItem, ScaleIn } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   導入フロー — ステップカード + 接続線アニメーション
   ═══════════════════════════════════════════════════════════════════════════ */

const steps = [
  {
    num: "01",
    title: "無料アカウント作成",
    desc: "フォームから簡単登録。クレジットカード不要で、2分ほどで完了します。",
    icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
    detail: "メールアドレスと基本情報を入力するだけ。即座にダッシュボードにアクセス可能。",
  },
  {
    num: "02",
    title: "LINE公式アカウント連携",
    desc: "Messaging APIの設定をガイドに沿って数分で完了。サポートチームが代行も可能です。",
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
    detail: "LINE公式アカウントのwebhook URLを設定するだけ。既存の友だちデータはそのまま引き継ぎ。",
  },
  {
    num: "03",
    title: "初期設定・構築",
    desc: "リッチメニュー・配信シナリオ・フォームをテンプレートから選んで構築。",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    detail: "業種別テンプレートから選ぶだけ。カスタマイズもノーコードで自由自在。",
  },
  {
    num: "04",
    title: "運用開始",
    desc: "配信・分析・改善のサイクルをスタート。困ったらチャットサポートがすぐ対応。",
    icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    detail: "ダッシュボードで効果を確認しながら、PDCAサイクルを回していきましょう。",
  },
];

export function Flow() {
  return (
    <Section id="flow">
      <div className="text-center">
        <Label>FLOW</Label>
        <Title>導入の流れ</Title>
        <Sub>最短3日で運用開始。初期設定はサポートチームが代行するため、現場の負担はほぼゼロです。</Sub>
      </div>

      {/* デスクトップ: 横並びステップ */}
      <div className="hidden md:block">
        <div className="grid grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <FadeIn key={s.num} delay={i * 0.15}>
              <motion.div
                className="relative flex h-full flex-col items-center rounded-2xl border border-slate-100 bg-white p-6 text-center transition hover:border-[#06C755]/20 hover:shadow-lg"
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {/* ステップ番号 */}
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#06C755] to-[#00B900] text-[14px] font-black text-white shadow-lg shadow-[#06C755]/20">
                  {s.num}
                </div>
                {/* アイコン */}
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755]/10">
                  <svg className="h-5 w-5 text-[#06C755]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={s.icon} /></svg>
                </div>
                <h3 className="mb-2 text-[15px] font-bold text-slate-800">{s.title}</h3>
                <p className="text-[12px] leading-relaxed text-slate-400">{s.desc}</p>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-300">{s.detail}</p>

                {/* 接続矢印 */}
                {i < steps.length - 1 && (
                  <div className="absolute -right-3 top-1/2 z-10 -translate-y-1/2">
                    <motion.div
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06C755]/10"
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <svg className="h-3 w-3 text-[#06C755]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>

      {/* モバイル: 縦並びタイムライン */}
      <div className="md:hidden">
        <ol className="mx-auto max-w-md list-none p-0 m-0">
          <StaggerChildren>
            {steps.map((s, i) => (
              <StaggerItem key={s.num}>
                <li className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#06C755] to-[#00B900] text-[12px] font-bold text-white shadow-lg shadow-[#06C755]/20">
                      {s.num}
                    </div>
                    {i < steps.length - 1 && <div className="my-1 h-full w-px bg-[#06C755]/20" />}
                  </div>
                  <div className={i < steps.length - 1 ? "pb-8" : ""}>
                    <h3 className="mb-1 text-[15px] font-bold">{s.title}</h3>
                    <p className="text-[13px] leading-relaxed text-slate-400">{s.desc}</p>
                  </div>
                </li>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </ol>
      </div>

      <ScaleIn delay={0.3}>
        <div className="mt-14 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-3">
            <span className="text-lg">&#9889;</span>
            <span className="text-[13px] font-bold text-amber-700">最短3日で導入完了 / 初期設定代行あり / クレジットカード不要</span>
          </div>
        </div>
      </ScaleIn>
    </Section>
  );
}
