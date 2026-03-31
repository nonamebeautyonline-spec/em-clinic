"use client";

import { motion } from "motion/react";
import { Section, Label, Title, Sub, DashboardPanel } from "./shared";
import { FadeIn, SlideIn, OrderTimeline, CartRecoveryFlow } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   EC6大機能 — 各機能を実際のEC管理画面風モックで表現
   ═══════════════════════════════════════════════════════════════════════════ */

/* ──── 1. 発送管理 — OrderTimelineモック ──── */
function ShippingFeature() {
  const steps = [
    { label: "注文確定", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "決済完了", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
    { label: "発送準備", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
    { label: "配送中", icon: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" },
    { label: "配達完了", icon: "M5 13l4 4L19 7" },
  ];

  return (
    <DashboardPanel title="発送管理 — 配送ステータス">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-[12px] font-bold text-slate-700">注文 #EC-20260328-0847</h4>
        <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[9px] font-bold text-sky-600">配送中</span>
      </div>
      <OrderTimeline steps={steps} className="justify-center" />
      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <svg className="h-3.5 w-3.5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ステータス変更時にLINEで自動通知
        </div>
      </div>
    </DashboardPanel>
  );
}

/* ──── 2. カゴ落ち対策 — CartRecoveryFlowモック ──── */
function CartRecoveryFeature() {
  return (
    <DashboardPanel title="カゴ落ち対策 — 回収フロー">
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { label: "カゴ落ち数", val: "547", color: "text-red-500" },
          { label: "通知送信", val: "412", color: "text-amber-600" },
          { label: "回収成功", val: "127", color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-slate-50 p-2 text-center">
            <div className="text-[9px] text-slate-400">{s.label}</div>
            <div className={`text-lg font-bold ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>
      <CartRecoveryFlow />
      <div className="mt-3 rounded-lg bg-emerald-500/10 p-2.5 text-center text-[10px] font-semibold text-emerald-600">
        回収率 23.2% / 回収売上 ¥847,200
      </div>
    </DashboardPanel>
  );
}

/* ──── 3. 顧客CRM — RFM分析テーブルモック ──── */
function CRMFeature() {
  const segments = [
    { name: "VIP顧客", r: "1", f: "1", m: "1", count: 124, color: "text-amber-600 bg-amber-500/10" },
    { name: "優良顧客", r: "2", f: "1", m: "2", count: 356, color: "text-emerald-600 bg-emerald-500/10" },
    { name: "新規顧客", r: "1", f: "5", m: "4", count: 892, color: "text-sky-600 bg-sky-500/10" },
    { name: "離反リスク", r: "4", f: "2", m: "2", count: 213, color: "text-red-500 bg-red-500/10" },
  ];

  return (
    <DashboardPanel title="顧客CRM — RFM分析">
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400">
              <th className="pb-2 text-left font-semibold">セグメント</th>
              <th className="pb-2 text-center font-semibold">R</th>
              <th className="pb-2 text-center font-semibold">F</th>
              <th className="pb-2 text-center font-semibold">M</th>
              <th className="pb-2 text-right font-semibold">人数</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => (
              <tr key={s.name} className="border-b border-slate-100">
                <td className="py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${s.color}`}>{s.name}</span>
                </td>
                <td className="py-2 text-center text-slate-500">{s.r}</td>
                <td className="py-2 text-center text-slate-500">{s.f}</td>
                <td className="py-2 text-center text-slate-500">{s.m}</td>
                <td className="py-2 text-right font-bold text-slate-700">{s.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardPanel>
  );
}

/* ──── 4. セグメント配信 — 条件設定モック ──── */
function SegmentFeature() {
  const conditions = [
    { field: "購入金額", op: "以上", val: "¥10,000" },
    { field: "最終購入", op: "以内", val: "30日" },
    { field: "カテゴリ", op: "含む", val: "コスメ" },
  ];

  return (
    <DashboardPanel title="セグメント配信 — 配信条件">
      <div className="space-y-2">
        {conditions.map((c, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">{c.field}</span>
            <span className="text-[10px] text-slate-400">{c.op}</span>
            <span className="text-[10px] font-bold text-slate-700">{c.val}</span>
            {i < conditions.length - 1 && (
              <span className="ml-auto rounded bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold text-violet-500">AND</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2">
        <span className="text-[10px] text-emerald-600">対象: 1,247人</span>
        <span className="text-[10px] font-bold text-emerald-700">予測CV率: 8.4%</span>
      </div>
    </DashboardPanel>
  );
}

/* ──── 5. クーポン管理 — クーポン一覧モック ──── */
function CouponFeature() {
  const coupons = [
    { name: "初回10%OFF", code: "WELCOME10", rate: "12.4%", status: "配信中", statusColor: "text-emerald-600 bg-emerald-500/10" },
    { name: "誕生日500円", code: "BDAY500", rate: "34.2%", status: "配信中", statusColor: "text-emerald-600 bg-emerald-500/10" },
    { name: "リピート特典", code: "REPEAT20", rate: "8.7%", status: "準備中", statusColor: "text-amber-600 bg-amber-500/10" },
  ];

  return (
    <DashboardPanel title="クーポン管理 — 一覧">
      <div className="space-y-2">
        {coupons.map((c) => (
          <div key={c.code} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
            <div className="flex-1">
              <div className="text-[11px] font-bold text-slate-700">{c.name}</div>
              <div className="text-[9px] text-slate-400 font-mono">{c.code}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-amber-600">利用率 {c.rate}</div>
              <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${c.statusColor}`}>{c.status}</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

/* ──── 6. 分析ダッシュボード — 売上推移+コホートモック ──── */
function AnalyticsFeature() {
  return (
    <DashboardPanel title="分析ダッシュボード — 売上推移">
      <div className="mb-3 flex items-end gap-1" style={{ height: 70 }}>
        {[38, 42, 55, 48, 62, 58, 45, 52, 68, 75, 82, 78].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-amber-600/80 to-amber-400/60" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-slate-400 mb-3">
        {["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "月間売上", val: "¥4.2M", change: "+12%", positive: true },
          { label: "客単価", val: "¥8,420", change: "+5.3%", positive: true },
          { label: "LTV", val: "¥24,800", change: "+18%", positive: true },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-slate-50 p-2 text-center">
            <div className="text-[8px] text-slate-400">{s.label}</div>
            <div className="text-[12px] font-bold text-slate-700">{s.val}</div>
            <div className={`text-[9px] font-bold ${s.positive ? "text-emerald-500" : "text-red-500"}`}>{s.change}</div>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

/* ──── メイン Features セクション ──── */
const features = [
  {
    id: "shipping",
    title: "発送管理・配送ステータス通知",
    desc: "注文確認から発送完了・配達完了まで、配送ステータスの変更に応じてLINEで自動通知。顧客からの「届きましたか？」問い合わせを大幅に削減。",
    Mock: ShippingFeature,
  },
  {
    id: "cart-recovery",
    title: "カゴ落ち対策・自動回収",
    desc: "カートに商品を残したまま離脱した顧客にLINEでリマインド通知。タイミングとメッセージを最適化し、売上機会を逃さない。",
    Mock: CartRecoveryFeature,
  },
  {
    id: "crm",
    title: "顧客CRM・購買履歴分析",
    desc: "購買履歴・金額・頻度・商品カテゴリで顧客を自動分類。RFM分析に基づくセグメント管理で、最適なアプローチを実現。",
    Mock: CRMFeature,
  },
  {
    id: "segment",
    title: "セグメント配信",
    desc: "購買金額・商品カテゴリ・購入頻度・最終購入日などEC特有の条件で配信対象を絞り込み。ブロック率を下げながらCV率を向上。",
    Mock: SegmentFeature,
  },
  {
    id: "coupon",
    title: "クーポン・ポイント管理",
    desc: "誕生日クーポン・初回購入特典・ランクアップ通知など、シナリオに応じたクーポンを自動発行。リピート率を効率的に引き上げ。",
    Mock: CouponFeature,
  },
  {
    id: "analytics",
    title: "分析ダッシュボード",
    desc: "売上推移・配信効果・セグメント別CV率・リピート率をリアルタイムで可視化。データドリブンなEC運営を支援。",
    Mock: AnalyticsFeature,
  },
];

export default function Features() {
  return (
    <Section id="features" className="bg-white">
      <div className="text-center">
        <Label>FEATURES</Label>
        <Title>ECに必要なLINE機能を<br className="md:hidden" />オールインワンで</Title>
        <Sub>複数ツールを使い分ける必要はありません。Lオペ for ECなら1つの管理画面でEC向けLINE運用のすべてが完結します。</Sub>
      </div>

      <div className="space-y-16 md:space-y-24">
        {features.map((f, i) => (
          <div key={f.id} className={`grid items-center gap-8 md:grid-cols-2 md:gap-12 ${i % 2 === 1 ? "md:[direction:rtl]" : ""}`}>
            <SlideIn from={i % 2 === 0 ? "left" : "right"} className={i % 2 === 1 ? "md:[direction:ltr]" : ""}>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                0{i + 1}
              </div>
              <h3 className="mb-3 text-xl font-extrabold text-slate-900 md:text-2xl">{f.title}</h3>
              <p className="text-[14px] leading-relaxed text-slate-500">{f.desc}</p>
            </SlideIn>
            <FadeIn direction={i % 2 === 0 ? "right" : "left"} delay={0.15} className={i % 2 === 1 ? "md:[direction:ltr]" : ""}>
              <f.Mock />
            </FadeIn>
          </div>
        ))}
      </div>
    </Section>
  );
}
