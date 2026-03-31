"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Section, Label, Title, Sub, MockWindow } from "./shared";
import { FadeIn, SlideIn, StaggerChildren, StaggerItem } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   機能紹介 — MockWindow風カード + ミニデモUI
   左右交互のSlideInレイアウト
   ═══════════════════════════════════════════════════════════════════════════ */

const features = [
  {
    id: "segment",
    title: "セグメント配信",
    desc: "タグ・属性・行動履歴で配信対象を精密に絞り込み。必要な人に必要なメッセージだけを届け、ブロック率を大幅に低減します。",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    color: "text-[#06C755]",
    bg: "bg-[#06C755]/10",
    demo: (
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-slate-500">配信セグメント設定</div>
        {[
          { label: "友だち追加日", value: "過去30日以内", active: true },
          { label: "タグ", value: "来店済み", active: true },
          { label: "未開封", value: "直近3回", active: false },
        ].map((seg) => (
          <div key={seg.label} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
            <span className="text-[11px] text-slate-600">{seg.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${seg.active ? "bg-[#06C755]/10 text-[#06C755]" : "bg-slate-100 text-slate-400"}`}>{seg.value}</span>
          </div>
        ))}
        <div className="mt-1 text-right text-[10px] text-[#06C755] font-semibold">対象: 1,247人</div>
      </div>
    ),
  },
  {
    id: "scenario",
    title: "シナリオ配信",
    desc: "友だち追加後のステップ配信やイベントトリガーに応じた自動メッセージで、顧客との関係構築を完全自動化。ドラッグ操作でフロー設計。",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    color: "text-amber-600",
    bg: "bg-amber-50",
    demo: (
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold text-slate-500">シナリオフロー</div>
        {[
          { step: "友だち追加", time: "即時", msg: "ウェルカムメッセージ" },
          { step: "1日後", time: "24h", msg: "自己紹介＋特典案内" },
          { step: "3日後", time: "72h", msg: "アンケート配信" },
          { step: "7日後", time: "168h", msg: "クーポン配信" },
        ].map((s, i) => (
          <div key={s.step} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-bold text-white ${i === 0 ? "bg-[#06C755]" : "bg-amber-400"}`}>{i + 1}</div>
              {i < 3 && <div className="h-2 w-px bg-slate-200" />}
            </div>
            <div className="flex-1 rounded-lg bg-slate-50 px-2.5 py-1.5">
              <div className="text-[10px] font-semibold text-slate-700">{s.step}</div>
              <div className="text-[9px] text-slate-400">{s.msg}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "richmenu",
    title: "リッチメニュー管理",
    desc: "ノーコードのビルダーで自由にリッチメニューを設計。ユーザーの属性に応じたメニュー出し分けで、一人ひとりに最適な導線を構築。",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
    color: "text-violet-600",
    bg: "bg-violet-50",
    demo: (
      <div>
        <div className="text-[10px] font-semibold text-slate-500 mb-2">リッチメニュー プレビュー</div>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 overflow-hidden">
          {["予約する", "クーポン", "店舗情報", "お問い合わせ", "ポイント", "メニュー"].map((label) => (
            <div key={label} className="flex flex-col items-center justify-center bg-[#06C755]/5 py-3 hover:bg-[#06C755]/10 transition cursor-pointer">
              <div className="mb-1 h-6 w-6 rounded-lg bg-[#06C755]/15" />
              <span className="text-[9px] font-semibold text-slate-600">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1">
          <span className="rounded-full bg-[#06C755]/10 px-2 py-0.5 text-[9px] font-semibold text-[#06C755]">デフォルト</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-400">VIP会員用</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-400">新規用</span>
        </div>
      </div>
    ),
  },
  {
    id: "reservation",
    title: "予約管理",
    desc: "LINE上で予約の受付・変更・キャンセルが完結。リマインド自動配信で無断キャンセルを防止し、稼働率を最大化。",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    demo: (
      <div>
        <div className="text-[10px] font-semibold text-slate-500 mb-2">本日の予約状況</div>
        <div className="space-y-1.5">
          {[
            { time: "10:00", name: "田中 様", status: "確認済", color: "bg-[#06C755]" },
            { time: "11:30", name: "佐藤 様", status: "リマインド送信済", color: "bg-amber-400" },
            { time: "14:00", name: "鈴木 様", status: "新規予約", color: "bg-blue-400" },
            { time: "15:30", name: "高橋 様", status: "確認済", color: "bg-[#06C755]" },
          ].map((r) => (
            <div key={r.time} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
              <span className="text-[11px] font-bold text-slate-700 shrink-0 w-10">{r.time}</span>
              <span className="flex-1 text-[11px] text-slate-600">{r.name}</span>
              <span className={`${r.color} rounded-full px-2 py-0.5 text-[8px] font-bold text-white`}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "form",
    title: "フォーム作成",
    desc: "アンケート・申し込み・問い合わせフォームをノーコードで作成。回答データはCRMに自動連携されます。",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    color: "text-pink-600",
    bg: "bg-pink-50",
    demo: (
      <div>
        <div className="text-[10px] font-semibold text-slate-500 mb-2">来店アンケート</div>
        <div className="space-y-2">
          <div>
            <div className="text-[10px] text-slate-600 mb-1">Q1. ご来店のきっかけは？</div>
            <div className="flex flex-wrap gap-1">
              {["友人紹介", "Instagram", "検索", "その他"].map((opt) => (
                <span key={opt} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] text-slate-500 hover:border-[#06C755] hover:text-[#06C755] cursor-pointer transition">{opt}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-600 mb-1">Q2. 満足度を教えてください</div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} className={`h-4 w-4 ${star <= 4 ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[9px] text-slate-400">回答率 87%</span>
            <span className="rounded-full bg-[#06C755] px-3 py-1 text-[9px] font-bold text-white">送信</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "analytics",
    title: "分析ダッシュボード",
    desc: "配信の開封率・クリック率・CV率をリアルタイムで可視化。友だち推移やセグメント別の効果測定も一目で把握。",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    color: "text-green-600",
    bg: "bg-green-50",
    demo: (
      <div>
        <div className="text-[10px] font-semibold text-slate-500 mb-2">配信パフォーマンス</div>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { label: "開封率", value: "82.1%", trend: "+3.2%" },
            { label: "クリック率", value: "24.5%", trend: "+1.8%" },
            { label: "CV率", value: "8.7%", trend: "+0.9%" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg bg-slate-50 p-2 text-center">
              <div className="text-[9px] text-slate-400">{kpi.label}</div>
              <div className="text-[14px] font-bold text-slate-800">{kpi.value}</div>
              <div className="text-[9px] font-semibold text-[#06C755]">{kpi.trend}</div>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-1" style={{ height: 40 }}>
          {[30, 45, 35, 55, 42, 65, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#06C755] to-[#06C755]/40" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[8px] text-slate-300"><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span></div>
      </div>
    ),
  },
];

export default function Features() {
  return (
    <Section id="features" className="bg-gradient-to-b from-white to-slate-50/50">
      <div className="text-center">
        <Label>FEATURES</Label>
        <Title>LINE運用に必要な機能を<br className="md:hidden" />オールインワンで</Title>
        <Sub>複数ツールを使い分ける必要はありません。Lオペなら1つの管理画面でLINE運用のすべてが完結します。</Sub>
      </div>

      <div className="space-y-16 md:space-y-24">
        {features.map((f, i) => (
          <SlideIn key={f.id} from={i % 2 === 0 ? "left" : "right"} delay={0.1}>
            <div className={`grid items-center gap-8 md:grid-cols-2 md:gap-12 ${i % 2 === 1 ? "md:[direction:rtl]" : ""}`}>
              {/* テキスト側 */}
              <div className={i % 2 === 1 ? "md:[direction:ltr]" : ""}>
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.bg}`}>
                  <svg className={`h-6 w-6 ${f.color}`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d={f.icon} /></svg>
                </div>
                <h3 className="mb-3 text-xl font-extrabold text-slate-900 md:text-2xl">{f.title}</h3>
                <p className="text-[14px] leading-relaxed text-slate-500">{f.desc}</p>
              </div>
              {/* デモUI側 */}
              <div className={i % 2 === 1 ? "md:[direction:ltr]" : ""}>
                <MockWindow title={`Lオペ — ${f.title}`}>
                  {f.demo}
                </MockWindow>
              </div>
            </div>
          </SlideIn>
        ))}
      </div>
    </Section>
  );
}
