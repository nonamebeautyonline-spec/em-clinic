"use client";

import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   Lオペ for CLINIC — Landing Page (Elegant + Feature Mockups)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ──── Shared UI ──── */
function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`px-5 py-24 md:py-32 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-4 inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-emerald-600 uppercase">
      {children}
    </span>
  );
}

function Title({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-slate-900 md:text-4xl lg:text-[2.6rem] ${className}`}>
      {children}
    </h2>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto mb-16 max-w-2xl text-[15px] leading-relaxed text-slate-400">
      {children}
    </p>
  );
}

/* browser chrome wrapper for mockups */
function MockWindow({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-[10px] font-medium text-slate-400">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ PAGE ══ */
export default function LPPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800" style={{ fontFeatureSettings: "'palt'" }}>
      <Nav />
      <Hero />
      <LogoBar />
      <Problems />
      <About />
      <FeatureShowcase />
      <Strengths />
      <UseCases />
      <Flow />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ NAV ══ */
function Nav() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "機能", href: "#features" },
    { label: "強み", href: "#strengths" },
    { label: "活用シーン", href: "#usecases" },
    { label: "料金", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-100/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-5">
        <a href="#" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-[13px] font-black text-white shadow-sm">L</span>
          <span className="text-[15px] font-bold tracking-tight">Lオペ <span className="text-emerald-600">for CLINIC</span></span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[13px] font-medium text-slate-500 transition hover:text-emerald-600">{l.label}</a>
          ))}
          <a href="#contact" className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-[13px] font-bold text-white shadow-sm shadow-emerald-500/20 transition hover:shadow-md hover:shadow-emerald-500/25">お問い合わせ</a>
        </div>
        <button className="flex items-center justify-center md:hidden" onClick={() => setOpen(!open)} aria-label="メニュー">
          <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.8}>{open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-white px-5 pb-5 md:hidden">
          {links.map((l) => (<a key={l.href} href={l.href} className="block py-3 text-sm text-slate-600" onClick={() => setOpen(false)}>{l.label}</a>))}
          <a href="#contact" className="mt-2 block rounded-lg bg-emerald-500 py-3 text-center text-sm font-bold text-white" onClick={() => setOpen(false)}>お問い合わせ</a>
        </div>
      )}
    </nav>
  );
}

/* ══════════════════════════════════════════════════════════════════ HERO ══ */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-[60px]">
      {/* bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50" />
      <div className="pointer-events-none absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-emerald-100/40 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-60 -left-40 h-[600px] w-[600px] rounded-full bg-teal-100/30 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* copy */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-white/60 px-4 py-1.5 text-[11px] font-semibold text-emerald-700 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              クリニック特化 LINE運用プラットフォーム
            </div>
            <h1 className="mb-6 text-[2.2rem] font-extrabold leading-[1.25] tracking-tight md:text-5xl lg:text-[3.2rem]">
              LINE 1つで<br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">クリニック業務</span>を<br />
              まるごとDX化
            </h1>
            <p className="mb-8 max-w-lg text-[15px] leading-[1.8] text-slate-500">
              患者CRM・セグメント配信・リッチメニュー構築・問診フォーム・
              予約管理・会計・配送まで。LINEを起点にクリニック運営の
              すべてをワンストップで実現します。
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#contact" className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3.5 text-[13px] font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-xl hover:shadow-emerald-500/30">無料で資料請求</a>
              <a href="#features" className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-[13px] font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-600">機能を見る</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-[11px] text-slate-400">
              {["初期設定サポート無料", "最短2週間で導入", "IT導入補助金対象"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{t}</span>
              ))}
            </div>
          </div>

          {/* Hero dashboard mock */}
          <div className="relative">
            <MockWindow title="Lオペ for CLINIC — ダッシュボード">
              {/* KPI row */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "本日の予約", val: "24", unit: "件", bg: "bg-blue-50", text: "text-blue-600" },
                  { label: "LINE友だち", val: "1,847", unit: "人", bg: "bg-emerald-50", text: "text-emerald-600" },
                  { label: "月間売上", val: "3.2", unit: "M", bg: "bg-amber-50", text: "text-amber-600" },
                  { label: "リピート率", val: "68", unit: "%", bg: "bg-violet-50", text: "text-violet-600" },
                ].map((k) => (
                  <div key={k.label} className={`rounded-lg ${k.bg} p-2.5`}>
                    <div className="text-[9px] text-slate-400">{k.label}</div>
                    <div className={`mt-0.5 text-lg font-bold leading-none ${k.text}`}>{k.val}<span className="text-[10px] font-normal text-slate-400">{k.unit}</span></div>
                  </div>
                ))}
              </div>
              {/* chart + sidebar */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="col-span-2 rounded-lg bg-slate-50 p-3">
                  <div className="mb-2 text-[9px] font-semibold text-slate-500">LINE友だち推移（7日間）</div>
                  <div className="flex items-end gap-1" style={{ height: 60 }}>
                    {[35, 42, 38, 55, 48, 62, 70].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-emerald-400 to-teal-300" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[8px] text-slate-300">
                    <span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <div className="text-[9px] font-semibold text-slate-500">対応状況</div>
                    <div className="mt-1.5 space-y-1">
                      {[{ c: "bg-red-400", l: "未対応", n: 3 }, { c: "bg-amber-400", l: "対応中", n: 7 }, { c: "bg-emerald-400", l: "完了", n: 18 }].map((s) => (
                        <div key={s.l} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span className={`h-2 w-2 rounded-full ${s.c}`} />{s.l} <span className="ml-auto font-bold">{s.n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5">
                    <div className="text-[9px] font-semibold text-emerald-600">配信結果</div>
                    <div className="mt-1 text-[10px] text-emerald-700">開封率 <span className="font-bold">78.3%</span></div>
                    <div className="text-[10px] text-emerald-700">予約CV <span className="font-bold">12.1%</span></div>
                  </div>
                </div>
              </div>
            </MockWindow>
            {/* floating notification */}
            <div className="absolute -right-3 -bottom-3 rounded-xl border border-emerald-100 bg-white px-4 py-2.5 shadow-lg shadow-emerald-100/40 md:-right-6 md:-bottom-5">
              <div className="text-[9px] text-slate-400">リマインド自動配信</div>
              <div className="text-[13px] font-bold text-emerald-600">24件 送信完了</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════ LOGOBAR ══ */
function LogoBar() {
  return (
    <div className="border-y border-slate-100 bg-slate-50/50 px-5 py-6">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
        {["LINE Messaging API", "Supabase", "Square", "ヤマト運輸 B2", "Twilio SMS", "Vercel"].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ PROBLEMS ═══ */
function Problems() {
  const items = [
    { icon: "M12 8v4m0 4h.01", text: "LINEの友だちは増えたけど活用しきれていない" },
    { icon: "M4 6h16M4 12h8m-8 6h16", text: "予約・問診・会計…バラバラなツールで管理が煩雑" },
    { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", text: "再診率・リピート率を上げる施策がない" },
    { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", text: "スタッフの電話対応・手作業に時間を取られすぎる" },
    { icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122", text: "患者属性に合わせたメッセージ配信ができない" },
    { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", text: "複数SaaSの費用がかさみコスト管理が難しい" },
  ];
  return (
    <Section>
      <div className="text-center">
        <Label>PROBLEM</Label>
        <Title>クリニック経営で<br className="md:hidden" />こんなお悩みはありませんか？</Title>
      </div>
      <div className="mx-auto mt-8 grid max-w-4xl gap-3 md:grid-cols-2">
        {items.map((p, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition hover:border-rose-200 hover:shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
              <svg className="h-5 w-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={p.icon} /></svg>
            </div>
            <p className="text-[13px] leading-relaxed text-slate-600">{p.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-6 py-2.5 text-[13px] font-semibold text-emerald-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          これらの課題を Lオペ for CLINIC がすべて解決します
        </div>
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════ ABOUT ═══ */
function About() {
  return (
    <Section className="bg-gradient-to-b from-emerald-50/40 to-white">
      <div className="text-center">
        <Label>ABOUT</Label>
        <Title>Lオペ for CLINIC とは</Title>
        <Sub>LINE公式アカウントを「クリニックの業務基盤」へ進化させる、医療機関専用のオールインワン運用プラットフォームです。</Sub>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {[
          { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", title: "LINE起点のCRM", desc: "友だち追加から問診・予約・フォローアップまで、患者とのすべてのタッチポイントをLINE上で一元管理。" },
          { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", title: "業務オールインワン", desc: "予約・会計・配送・カルテ・スケジュール管理まで、バラバラだったツールを1つに統合。" },
          { icon: "M13 10V3L4 14h7v7l9-11h-7z", title: "ノーコード自動化", desc: "リッチメニュー・フォーム・自動アクションをGUIで構築。エンジニア不要で現場完結。" },
        ].map((c) => (
          <div key={c.title} className="group rounded-2xl border border-slate-100 bg-white p-8 text-center transition hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 transition group-hover:from-emerald-100 group-hover:to-teal-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={c.icon} /></svg>
            </div>
            <h3 className="mb-2 text-lg font-bold tracking-tight">{c.title}</h3>
            <p className="text-[13px] leading-relaxed text-slate-400">{c.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════ FEATURE SHOWCASE ═ */
function FeatureShowcase() {
  return (
    <Section id="features">
      <div className="text-center">
        <Label>FEATURES</Label>
        <Title>クリニック運営に必要な<br className="md:hidden" />すべての機能を搭載</Title>
        <Sub>汎用LINEツールにはない、医療現場に最適化された機能群。各機能の管理画面をご覧ください。</Sub>
      </div>

      <div className="space-y-28">
        {/* ── 1. タグ管理 ── */}
        <FeatureRow reverse={false} label="患者CRM" title="タグ管理" desc="患者にカラー付きタグを自由に設定。「初診」「美容」「ダイエット」など診療内容・属性ごとに分類し、セグメント配信の基盤を構築。友だち追加時の自動タグ付けにも対応します。" details={["10色のカラーバリエーション", "自動タグルール設定", "一括タグ付け / 一括解除"]}>
          <MockWindow title="LINE管理 — タグ管理">
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-[10px] font-semibold text-slate-500">タグ名</span>
                <span className="text-[10px] font-semibold text-slate-500">患者数</span>
              </div>
              {[
                { name: "初診", color: "bg-blue-400", count: 342 },
                { name: "美容・スキンケア", color: "bg-pink-400", count: 189 },
                { name: "ダイエット外来", color: "bg-orange-400", count: 127 },
                { name: "再診促進対象", color: "bg-violet-400", count: 85 },
                { name: "VIP", color: "bg-amber-400", count: 43 },
                { name: "オンライン診療", color: "bg-teal-400", count: 216 },
              ].map((t) => (
                <div key={t.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 transition hover:bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-3 rounded-full ${t.color}`} />
                    <span className="text-[12px] font-medium text-slate-700">{t.name}</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">{t.count}名</span>
                </div>
              ))}
              <div className="mt-2 flex justify-center">
                <button className="rounded-lg border border-dashed border-emerald-300 px-4 py-1.5 text-[10px] font-semibold text-emerald-500">+ 新しいタグを追加</button>
              </div>
            </div>
          </MockWindow>
        </FeatureRow>

        {/* ── 2. 対応マーク ── */}
        <FeatureRow reverse={true} label="患者CRM" title="対応マーク（ステータス管理）" desc="「未対応」「対応中」「完了」「重要」「保留」など、患者ごとの対応状況を色付きマークで可視化。スタッフ間の引き継ぎ漏れを防止し、対応品質を標準化します。" details={["6段階のステータス", "カスタムラベル・カラー変更", "一覧での即座の色分け表示"]}>
          <MockWindow title="LINE管理 — 対応マーク">
            <div className="space-y-2">
              {[
                { mark: "○", color: "text-slate-300", bg: "bg-white", label: "なし", count: 421 },
                { mark: "●", color: "text-red-500", bg: "bg-red-50", label: "未対応", count: 12 },
                { mark: "●", color: "text-amber-500", bg: "bg-amber-50", label: "対応中", count: 8 },
                { mark: "●", color: "text-emerald-500", bg: "bg-emerald-50", label: "完了", count: 356 },
                { mark: "●", color: "text-blue-500", bg: "bg-blue-50", label: "重要", count: 5 },
                { mark: "●", color: "text-slate-400", bg: "bg-slate-50", label: "保留", count: 14 },
              ].map((m) => (
                <div key={m.label} className={`flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 ${m.bg}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg leading-none ${m.color}`}>{m.mark}</span>
                    <span className="text-[12px] font-medium text-slate-700">{m.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{m.count}名</span>
                </div>
              ))}
            </div>
          </MockWindow>
        </FeatureRow>

        {/* ── 3. セグメント配信 ── */}
        <FeatureRow reverse={false} label="メッセージ配信" title="セグメント配信" desc="タグ・マーク・友だち情報の組み合わせで配信対象を精密に絞り込み。「再診促進は3ヶ月未受診の美容タグ患者のみ」といった高度なターゲティングが可能です。" details={["複数条件の AND/OR 組み合わせ", "除外条件の設定", "配信前プレビュー（対象者数・一覧）"]}>
          <MockWindow title="LINE管理 — セグメント配信">
            <div className="space-y-3">
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-700">絞り込み条件</div>
              {/* conditions */}
              <div className="space-y-2 rounded-lg border border-slate-100 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700">タグ</span>
                  <span className="text-[11px] text-slate-600">美容・スキンケア</span>
                  <span className="text-[9px] text-slate-400">を含む</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">AND</span>
                  <span className="rounded bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-700">マーク</span>
                  <span className="text-[11px] text-slate-600">完了</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">AND</span>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">情報欄</span>
                  <span className="text-[11px] text-slate-600">最終来院日 &lt; 90日前</span>
                </div>
              </div>
              {/* preview */}
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">配信プレビュー</span>
                  <div className="flex gap-3 text-[10px]">
                    <span className="text-emerald-600 font-bold">配信可: 67名</span>
                    <span className="text-slate-400">UID無し: 4名</span>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {["田中 美咲", "佐藤 優子", "山田 あかり"].map((n) => (
                    <div key={n} className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="h-5 w-5 rounded-full bg-slate-200" />
                      {n}
                      <span className="ml-auto rounded bg-pink-50 px-1.5 py-0.5 text-[8px] text-pink-500">美容</span>
                    </div>
                  ))}
                  <div className="text-center text-[9px] text-slate-300">...他 64名</div>
                </div>
              </div>
            </div>
          </MockWindow>
        </FeatureRow>

        {/* ── 4. リッチメニュービルダー ── */}
        <FeatureRow reverse={true} label="ノーコード構築" title="リッチメニュービルダー" desc="ドラッグ操作でLINEリッチメニューのボタン配置を自由に設計。各ボタンにURL・電話・テンプレート送信・タグ操作・メニュー切替などのアクションを設定できます。" details={["ビジュアルエディタ", "6分割〜自由配置", "条件分岐アクション / LINE API自動連携"]}>
          <MockWindow title="LINE管理 — リッチメニュー編集">
            <div className="grid grid-cols-2 gap-3">
              {/* menu preview */}
              <div>
                <div className="mb-2 text-[9px] font-semibold text-slate-500">メニュープレビュー</div>
                <div className="grid grid-cols-3 grid-rows-2 gap-[2px] overflow-hidden rounded-lg border border-slate-200">
                  {[
                    { label: "予約する", bg: "bg-emerald-100 text-emerald-700" },
                    { label: "問診票", bg: "bg-blue-100 text-blue-700" },
                    { label: "お知らせ", bg: "bg-amber-100 text-amber-700" },
                    { label: "マイページ", bg: "bg-violet-100 text-violet-700" },
                    { label: "処方履歴", bg: "bg-pink-100 text-pink-700" },
                    { label: "お問合せ", bg: "bg-slate-100 text-slate-600" },
                  ].map((b, i) => (
                    <div key={i} className={`flex items-center justify-center py-5 text-[9px] font-bold ${b.bg}`}>
                      {b.label}
                    </div>
                  ))}
                </div>
              </div>
              {/* action settings */}
              <div>
                <div className="mb-2 text-[9px] font-semibold text-slate-500">ボタン1: 予約する</div>
                <div className="space-y-1.5">
                  <div className="rounded-md bg-slate-50 px-2.5 py-2">
                    <div className="text-[8px] text-slate-400">アクション</div>
                    <div className="text-[10px] font-medium text-slate-700">URI — 予約ページを開く</div>
                  </div>
                  <div className="rounded-md bg-slate-50 px-2.5 py-2">
                    <div className="text-[8px] text-slate-400">追加アクション 1</div>
                    <div className="text-[10px] font-medium text-slate-700">タグ付与 →「予約意向あり」</div>
                  </div>
                  <div className="rounded-md bg-slate-50 px-2.5 py-2">
                    <div className="text-[8px] text-slate-400">追加アクション 2</div>
                    <div className="text-[10px] font-medium text-slate-700">マーク変更 →「対応中」</div>
                  </div>
                  <div className="rounded-md border border-dashed border-emerald-300 px-2.5 py-1.5 text-center text-[9px] text-emerald-500">+ アクション追加</div>
                </div>
              </div>
            </div>
          </MockWindow>
        </FeatureRow>

        {/* ── 5. 回答フォームビルダー ── */}
        <FeatureRow reverse={false} label="ノーコード構築" title="回答フォームビルダー" desc="問診票・アンケート・同意書などのフォームをGUIで作成。患者はLINE上からワンタップでフォームにアクセスし回答。回答データは管理画面に自動集約されます。" details={["フォルダ整理 / 公開URL自動生成", "ファイルアップロード対応", "回答一覧リアルタイム閲覧"]}>
          <MockWindow title="LINE管理 — フォーム回答一覧">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-700">初診問診票</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-600">公開中</span>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <div className="grid grid-cols-4 gap-px bg-slate-100">
                  {["回答者", "年齢", "主訴", "回答日時"].map((h) => (
                    <div key={h} className="bg-slate-50 px-3 py-2 text-[9px] font-semibold text-slate-500">{h}</div>
                  ))}
                </div>
                {[
                  { name: "田中 美咲", age: "32歳", chief: "肌荒れ・ニキビ", date: "2/7 14:23" },
                  { name: "佐藤 優子", age: "28歳", chief: "シミ・くすみ", date: "2/7 11:05" },
                  { name: "鈴木 健太", age: "41歳", chief: "AGA相談", date: "2/6 18:42" },
                  { name: "高橋 里奈", age: "35歳", chief: "ダイエット外来", date: "2/6 10:18" },
                ].map((r) => (
                  <div key={r.name} className="grid grid-cols-4 gap-px border-t border-slate-100">
                    <div className="flex items-center gap-1.5 bg-white px-3 py-2 text-[10px] font-medium text-slate-700"><span className="h-4 w-4 rounded-full bg-slate-200" />{r.name}</div>
                    <div className="bg-white px-3 py-2 text-[10px] text-slate-500">{r.age}</div>
                    <div className="bg-white px-3 py-2 text-[10px] text-slate-500">{r.chief}</div>
                    <div className="bg-white px-3 py-2 text-[10px] text-slate-400">{r.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </MockWindow>
        </FeatureRow>

        {/* ── 6. アクション自動化 ── */}
        <FeatureRow reverse={true} label="ノーコード構築" title="アクション自動化" desc="「友だち追加→挨拶メッセージ→タグ付与→リッチメニュー切替」のような一連のワークフローをステップ形式で構築。条件分岐にも対応し、患者の状態に応じた自動対応を実現。" details={["ステップ形式でワークフロー構築", "条件分岐（タグ・マーク・日時）", "遅延送信（1分〜1日）"]}>
          <MockWindow title="LINE管理 — アクション編集">
            <div className="space-y-1">
              {[
                { step: 1, type: "メッセージ送信", detail: "ご登録ありがとうございます！", icon: "💬", color: "border-blue-200 bg-blue-50" },
                { step: 2, type: "タグ付与", detail: "「新規登録」タグを付与", icon: "🏷️", color: "border-violet-200 bg-violet-50" },
                { step: 3, type: "条件分岐", detail: "タグ「美容」を含む場合 →", icon: "🔀", color: "border-amber-200 bg-amber-50" },
                { step: 4, type: "テンプレート送信", detail: "美容メニューご案内（5分後）", icon: "📋", color: "border-emerald-200 bg-emerald-50" },
                { step: 5, type: "リッチメニュー切替", detail: "美容患者用メニューに変更", icon: "📱", color: "border-pink-200 bg-pink-50" },
              ].map((s, i) => (
                <div key={s.step}>
                  <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${s.color}`}>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-500 shadow-sm">{s.step}</span>
                    <span className="text-sm">{s.icon}</span>
                    <div>
                      <div className="text-[10px] font-semibold text-slate-700">{s.type}</div>
                      <div className="text-[9px] text-slate-400">{s.detail}</div>
                    </div>
                  </div>
                  {i < 4 && <div className="ml-6 flex h-4 items-center"><div className="h-full w-px bg-slate-200" /></div>}
                </div>
              ))}
            </div>
          </MockWindow>
        </FeatureRow>

        {/* ── 7. 予約・スケジュール ── */}
        <FeatureRow reverse={false} label="業務管理" title="予約・スケジュール管理" desc="月別・週別の予約カレンダー、医師別のスケジュール管理・休日設定に対応。LINE経由の予約をそのままダッシュボードで管理できます。" details={["月 / 週 ビュー切り替え", "医師別スケジュール管理", "休日設定 / 予約ステータス追跡"]}>
          <MockWindow title="予約管理 — 週間ビュー">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-700">2025年2月 第2週</span>
                <div className="flex gap-1">
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[8px] font-semibold text-emerald-600">予約 24件</span>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[8px] font-semibold text-blue-600">完了 18件</span>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <div className="grid grid-cols-6 gap-px bg-slate-100">
                  <div className="bg-slate-50 px-2 py-1.5 text-[8px] font-semibold text-slate-400">時間</div>
                  {["月 10", "火 11", "水 12", "木 13", "金 14"].map((d) => (
                    <div key={d} className="bg-slate-50 px-2 py-1.5 text-center text-[8px] font-semibold text-slate-500">{d}</div>
                  ))}
                </div>
                {["10:00", "11:00", "14:00", "15:00"].map((t) => (
                  <div key={t} className="grid grid-cols-6 gap-px border-t border-slate-100">
                    <div className="bg-white px-2 py-2 text-[9px] text-slate-400">{t}</div>
                    {[0, 1, 2, 3, 4].map((c) => {
                      const has = (t === "10:00" && c < 3) || (t === "11:00" && c !== 2) || (t === "14:00" && c > 1) || (t === "15:00" && c === 0);
                      return (
                        <div key={c} className="bg-white px-1 py-1.5">
                          {has && <div className="rounded bg-emerald-50 px-1 py-1 text-[8px] leading-tight text-emerald-700">予約あり</div>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </MockWindow>
        </FeatureRow>

        {/* ── 8. 会計管理 ── */}
        <FeatureRow reverse={true} label="業務管理" title="会計・銀行振込管理" desc="Square決済連携による売上追跡・銀行振込の消込処理・返金管理まで、クリニックの金流をダッシュボードで一元可視化。日別・月別レポートで経営判断を支援します。" details={["Square決済連携", "振込消込ワークフロー", "返金処理 / 日次KPIレポート"]}>
          <MockWindow title="会計管理 — 月次サマリー">
            <div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-emerald-50 p-3 text-center"><div className="text-[9px] text-slate-400">カード決済</div><div className="text-lg font-bold text-emerald-600">¥2.4M</div></div>
                <div className="rounded-lg bg-blue-50 p-3 text-center"><div className="text-[9px] text-slate-400">銀行振込</div><div className="text-lg font-bold text-blue-600">¥820K</div></div>
                <div className="rounded-lg bg-amber-50 p-3 text-center"><div className="text-[9px] text-slate-400">返金額</div><div className="text-lg font-bold text-amber-600">¥35K</div></div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="text-[9px] font-semibold text-slate-500">直近の取引</div>
                {[
                  { patient: "田中 美咲", amount: "¥28,000", method: "Square", status: "完了", statusColor: "text-emerald-600 bg-emerald-50" },
                  { patient: "佐藤 優子", amount: "¥15,000", method: "振込", status: "消込待ち", statusColor: "text-amber-600 bg-amber-50" },
                  { patient: "山田 あかり", amount: "¥42,000", method: "Square", status: "完了", statusColor: "text-emerald-600 bg-emerald-50" },
                ].map((tx) => (
                  <div key={tx.patient} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <div className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-slate-200" /><span className="text-[10px] font-medium text-slate-700">{tx.patient}</span></div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400">{tx.method}</span>
                      <span className="text-[11px] font-bold text-slate-700">{tx.amount}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[8px] font-semibold ${tx.statusColor}`}>{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </MockWindow>
        </FeatureRow>

        {/* ── 9. 配送管理 ── */}
        <FeatureRow reverse={false} label="業務管理" title="配送・発送管理" desc="オンライン処方の配送業務をシステム化。ヤマトB2形式のCSV出力・追跡番号管理・配送ラベル印刷まで対応。処方薬の発送漏れを防止し、患者へ追跡リンクも自動共有できます。" details={["ヤマトB2 CSV ワンクリック出力", "追跡番号一括登録", "患者へ追跡リンク自動通知"]}>
          <MockWindow title="配送管理 — 本日の出荷">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-700">出荷待ち: 5件</span>
                <button className="rounded-md bg-emerald-500 px-3 py-1 text-[9px] font-bold text-white">B2 CSV出力</button>
              </div>
              {[
                { name: "田中 美咲", product: "ビタミンC処方", tracking: "—", status: "出荷待ち", sc: "text-amber-600 bg-amber-50" },
                { name: "高橋 里奈", product: "ダイエット処方", tracking: "4912-3456-7890", status: "出荷済み", sc: "text-emerald-600 bg-emerald-50" },
                { name: "山田 太郎", product: "AGA処方セット", tracking: "4912-1234-5678", status: "配達完了", sc: "text-blue-600 bg-blue-50" },
              ].map((s) => (
                <div key={s.name} className="rounded-lg border border-slate-100 p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-slate-200" /><span className="text-[10px] font-medium text-slate-700">{s.name}</span></div>
                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-semibold ${s.sc}`}>{s.status}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
                    <span>{s.product}</span>
                    <span className="font-mono">{s.tracking}</span>
                  </div>
                </div>
              ))}
            </div>
          </MockWindow>
        </FeatureRow>
      </div>
    </Section>
  );
}

/* Feature row layout helper */
function FeatureRow({
  reverse,
  label,
  title,
  desc,
  details,
  children,
}: {
  reverse: boolean;
  label: string;
  title: string;
  desc: string;
  details: string[];
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col items-center gap-10 lg:flex-row lg:gap-16 ${reverse ? "lg:flex-row-reverse" : ""}`}>
      {/* mockup */}
      <div className="w-full lg:w-1/2">{children}</div>
      {/* text */}
      <div className="w-full lg:w-1/2">
        <span className="mb-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-600">{label}</span>
        <h3 className="mb-3 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">{title}</h3>
        <p className="mb-5 text-[13px] leading-[1.9] text-slate-500">{desc}</p>
        <ul className="space-y-2">
          {details.map((d) => (
            <li key={d} className="flex items-start gap-2.5 text-[13px] text-slate-600">
              <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[8px] text-emerald-600">&#10003;</span>
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ STRENGTHS ═══ */
function Strengths() {
  return (
    <Section id="strengths" className="bg-slate-900 text-white">
      <div className="text-center">
        <Label>STRENGTHS</Label>
        <h2 className="mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-white md:text-4xl">Lオペ for CLINIC が選ばれる<br className="md:hidden" />3つの理由</h2>
        <p className="mx-auto mb-16 max-w-2xl text-[14px] leading-relaxed text-slate-400">汎用LINEマーケツールでもなく、単なる予約システムでもない。クリニック業務に深く入り込んだ「現場起点」の設計思想が最大の差別化です。</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { num: "01", title: "クリニック専用設計", sub: "vs. 汎用LINEツール", points: ["Lステップ等は飲食・EC向け設計。医療特有の「問診→予約→診療→処方→フォロー」導線に未対応", "患者CRM・対応マーク・処方管理・配送追跡まで、クリニック業務フローに完全特化", "友だち追加時の自動問診誘導・診療後の自動フォローなど、医療最適シナリオをプリセット"] },
          { num: "02", title: "真のオールインワン", sub: "vs. 単機能SaaS複数利用", points: ["予約＋LINE配信＋会計＋配送管理…月額10万超のツール代を1本に集約", "「LINE登録→問診→予約→来院→決済」まで1画面で追跡。データ分断ゼロ", "スタッフのツール間移動・二重入力がゼロに。学習コストも大幅削減"] },
          { num: "03", title: "ノーコードで現場完結", sub: "vs. エンジニア依存", points: ["リッチメニュー・フォーム・自動アクションの構築がすべてGUI操作で完結", "「キャンペーン用リッチメニューを差し替えたい」→管理画面から即反映。開発待ちゼロ", "条件分岐・遅延送信・セグメント配信も直感操作。ITに詳しくないスタッフでも運用可能"] },
        ].map((s) => (
          <div key={s.num} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-7 backdrop-blur">
            <div className="mb-3 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-3xl font-black text-transparent">{s.num}</div>
            <h3 className="mb-1 text-lg font-bold">{s.title}</h3>
            <p className="mb-5 text-[11px] font-semibold text-emerald-400">{s.sub}</p>
            <ul className="space-y-3">
              {s.points.map((p, i) => (
                <li key={i} className="flex gap-3 text-[12px] leading-relaxed text-slate-300">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[8px] text-emerald-400">&#10003;</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════ USE CASES ═══ */
function UseCases() {
  const cases = [
    { scene: "朝の業務開始", title: "ダッシュボードで今日の予約・売上を即把握", before: "予約台帳・売上表・LINE管理画面を3つ開いて確認。15分かかる", after: "ダッシュボード1画面で本日の予約数・売上・対応状況を確認。1分で完了", tag: "ダッシュボード" },
    { scene: "新患の友だち追加", title: "友だち追加→問診→予約を全自動で誘導", before: "友だち追加後に手動で挨拶メッセージを送り、問診票URLを別途送付", after: "友だち追加と同時に挨拶・問診フォーム・リッチメニュー切替が自動実行", tag: "アクション自動化" },
    { scene: "再診促進", title: "3ヶ月未受診の美容患者にピンポイント配信", before: "Excelで該当者を手動抽出し、一人ずつLINE送信。半日作業", after: "セグメント条件を設定しテンプレートで一括配信。10分で完了", tag: "セグメント配信" },
    { scene: "予約前日", title: "予約リマインドの自動送信で無断キャンセル防止", before: "受付スタッフが電話で1件ずつリマインド。1時間超", after: "予約患者へLINEリマインドを一括送信。結果もリアルタイム確認", tag: "リマインド配信" },
    { scene: "処方後", title: "配送手配から追跡通知まで一気通貫", before: "配送業者サイトで送り状作成→追跡番号を手動でLINE送信", after: "B2 CSVワンクリック出力→追跡番号一括登録→自動通知", tag: "配送管理" },
    { scene: "月末", title: "売上・コンバージョン・患者動向をKPIで可視化", before: "Square・銀行口座・予約台帳を突き合わせExcelで集計。丸1日", after: "ダッシュボードで月間KPIを即確認。エクスポートも可能", tag: "ダッシュボード" },
  ];
  return (
    <Section id="usecases" className="bg-slate-50/50">
      <div className="text-center">
        <Label>USE CASES</Label>
        <Title>現場のリアルな1日で見る活用シーン</Title>
        <Sub>クリニックの日常業務がどう変わるのか、Before / After で具体的にご紹介します。</Sub>
      </div>
      <div className="space-y-4">
        {cases.map((c, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition hover:shadow-md hover:shadow-slate-100">
            <div className="flex flex-col md:flex-row">
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-6 py-4 md:w-48 md:flex-col md:justify-center md:border-r md:border-b-0">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">{c.scene}</span>
                <span className="text-[9px] text-slate-400">{c.tag}</span>
              </div>
              <div className="flex-1 p-5 md:p-6">
                <h4 className="mb-3 text-[14px] font-bold text-slate-800">{c.title}</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-rose-50/60 p-3.5">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-rose-500"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-100 text-[8px]">&#10005;</span>Before</div>
                    <p className="text-[12px] leading-relaxed text-rose-900/60">{c.before}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/60 p-3.5">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[8px]">&#10003;</span>After</div>
                    <p className="text-[12px] leading-relaxed text-emerald-900/60">{c.after}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════ FLOW ═══ */
function Flow() {
  const steps = [
    { num: "01", title: "お問い合わせ", desc: "フォームまたはLINEからご相談。デモ画面をお見せしながら貴院の課題をヒアリングします。" },
    { num: "02", title: "プラン決定", desc: "貴院の規模・診療科・運用体制に合わせた最適プランをご提案。ご契約後、導入準備を開始。" },
    { num: "03", title: "環境構築・設定代行", desc: "LINE連携・リッチメニュー初期構築・問診フォーム作成・患者データ移行をサポートチームが代行。" },
    { num: "04", title: "運用開始", desc: "スタッフ向け操作研修を実施し運用開始。導入後も専任担当が活用提案をサポートします。" },
  ];
  return (
    <Section id="flow">
      <div className="text-center">
        <Label>FLOW</Label>
        <Title>導入の流れ</Title>
        <Sub>お問い合わせから最短2週間で運用開始。初期設定はサポートチームが代行するため、現場の負担はほぼゼロです。</Sub>
      </div>
      <div className="mx-auto max-w-3xl">
        {steps.map((s, i) => (
          <div key={s.num} className="flex gap-5">
            <div className="flex flex-col items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-[12px] font-bold text-white shadow-lg shadow-emerald-500/20">{s.num}</div>
              {i < steps.length - 1 && <div className="my-1 h-full w-px bg-emerald-200/60" />}
            </div>
            <div className={i < steps.length - 1 ? "pb-10" : ""}>
              <h4 className="mb-1 text-[15px] font-bold">{s.title}</h4>
              <p className="text-[13px] leading-relaxed text-slate-400">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-12 text-center">
        <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-6 py-2.5 text-[12px] font-semibold text-amber-700">最短2週間で導入完了 / 初期設定代行あり</span>
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════ PRICING ═══ */
function Pricing() {
  return (
    <Section id="pricing" className="bg-gradient-to-b from-white to-emerald-50/20">
      <div className="text-center">
        <Label>PRICING</Label>
        <Title>料金プラン</Title>
        <Sub>クリニック運営に必要なすべての機能を、シンプルな料金体系でご提供します。</Sub>
      </div>
      <div className="mx-auto max-w-lg">
        <div className="overflow-hidden rounded-2xl border-2 border-emerald-500 bg-white shadow-2xl shadow-emerald-100/40">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-6 text-center text-white">
            <h3 className="text-xl font-bold">Lオペ for CLINIC</h3>
            <p className="mt-1 text-[13px] text-emerald-100">オールインワンプラン</p>
          </div>
          <div className="p-8">
            <div className="mb-5 text-center">
              <div className="text-[12px] text-slate-400">初期導入費用</div>
              <div className="text-3xl font-extrabold text-slate-900">¥300,000〜<span className="text-sm font-normal text-slate-400">（税別）</span></div>
              <p className="mt-1 text-[11px] text-slate-400">LINE連携設定・リッチメニュー構築・データ移行・研修込み</p>
            </div>
            <div className="mb-7 rounded-xl bg-emerald-50 p-6 text-center">
              <div className="text-[12px] text-slate-400">月額利用料</div>
              <div className="text-4xl font-extrabold text-emerald-600">¥50,000<span className="text-sm font-normal text-slate-400">/月（税別）</span></div>
              <p className="mt-1 text-[11px] text-slate-400">全機能 / ユーザー数無制限 / アップデート無料</p>
            </div>
            <ul className="mb-6 grid grid-cols-2 gap-1.5 text-[12px] text-slate-600">
              {["患者CRM（タグ・マーク・情報欄）", "セグメント配信・一斉配信", "リッチメニュービルダー", "回答フォームビルダー", "アクション自動化", "予約・スケジュール管理", "会計・銀行振込管理", "配送管理", "リアルタイムダッシュボード", "メディアライブラリ", "カルテ検索", "専任サポート"].map((f) => (
                <li key={f} className="flex items-start gap-1.5"><span className="mt-0.5 text-emerald-500">&#10003;</span>{f}</li>
              ))}
            </ul>
            <a href="#contact" className="block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-center text-[13px] font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-xl">まずは資料請求（無料）</a>
          </div>
        </div>
      </div>
      {/* comparison */}
      <div className="mx-auto mt-16 max-w-4xl">
        <h3 className="mb-5 text-center text-[15px] font-bold text-slate-700">競合サービスとの価格比較</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-emerald-50">{["サービス", "初期費用", "月額", "特徴"].map((h) => (<th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>))}</tr></thead>
            <tbody>
              {[
                { name: "Lオペ for CLINIC", i: "¥300,000〜", m: "¥50,000", note: "クリニック特化 / LINE CRM+業務DX / オールインワン", hl: true },
                { name: "メディカルフォース", i: "非公開", m: "¥50,000〜", note: "自由診療特化 / 電子カルテ中心", hl: false },
                { name: "CLINICSカルテ", i: "¥0〜1,000,000", m: "¥40,000〜", note: "電子カルテ＋オンライン診療", hl: false },
                { name: "Medibot", i: "要問合せ", m: "要問合せ", note: "LINE特化 / オンライン診療", hl: false },
                { name: "Lステップ（プロ）", i: "¥0", m: "¥32,780", note: "汎用LINEマーケ / 医療特化なし", hl: false },
                { name: "Liny（プレミアム）", i: "¥54,780", m: "〜¥69,800", note: "汎用LINE拡張 / 医療特化なし", hl: false },
              ].map((r) => (
                <tr key={r.name} className={`border-t border-slate-100 ${r.hl ? "bg-emerald-50/50 font-semibold" : ""}`}>
                  <td className="px-4 py-2.5">{r.hl && <span className="mr-1 text-emerald-500">&#9733;</span>}{r.name}</td>
                  <td className="px-4 py-2.5">{r.i}</td>
                  <td className="px-4 py-2.5">{r.m}</td>
                  <td className="px-4 py-2.5 text-slate-400">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-center text-[10px] text-slate-400">※ 各サービスの価格は2025年公開情報に基づく参考値です</p>
      </div>
      {/* cost sim */}
      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-amber-200/60 bg-amber-50/50 p-7">
        <h4 className="mb-4 text-center text-[15px] font-bold text-amber-800">コスト比較シミュレーション</h4>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl bg-white p-5">
            <div className="mb-2 text-[12px] font-bold text-rose-500">ツール個別導入の場合</div>
            <ul className="space-y-1 text-[12px] text-slate-500">
              <li>LINE配信ツール：¥20,000〜33,000</li><li>予約システム：¥10,000〜40,000</li><li>会計ソフト：¥5,000〜15,000</li><li>配送管理：¥5,000〜</li>
            </ul>
            <div className="mt-3 border-t border-slate-100 pt-2 text-[14px] font-bold text-rose-600">合計：月額 ¥40,000〜93,000+</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-5">
            <div className="mb-2 text-[12px] font-bold text-emerald-600">Lオペ for CLINIC の場合</div>
            <ul className="space-y-1 text-[12px] text-slate-500">
              <li>LINE CRM ＋ セグメント配信</li><li>予約・スケジュール管理</li><li>会計・銀行振込管理</li><li>配送管理 ＋ その他全機能</li>
            </ul>
            <div className="mt-3 border-t border-emerald-200 pt-2 text-[14px] font-bold text-emerald-700">すべて込みで月額 ¥50,000</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════ FAQ ═══ */
function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const faqs = [
    { q: "LINE公式アカウントを持っていなくても導入できますか？", a: "はい。導入サポートの一環として、LINE公式アカウントの開設・Messaging APIの設定まで代行いたします。" },
    { q: "保険診療のクリニックでも使えますか？", a: "はい。自由診療・保険診療を問わずご利用いただけます。予約管理・患者CRM・リマインド配信など、診療形態に関わらず活用できます。" },
    { q: "導入にどのくらいの期間がかかりますか？", a: "最短2週間で運用開始が可能です。LINE連携設定・リッチメニュー構築・問診フォーム作成・スタッフ研修まで、導入チームがワンストップでサポートします。" },
    { q: "既存の予約システムや電子カルテとの連携は可能ですか？", a: "連携の可否はシステムによります。API連携・CSV連携など、貴院の既存システムに合わせた連携方法をご提案します。" },
    { q: "スタッフのITリテラシーが低くても運用できますか？", a: "はい。ノーコードのGUI操作で設計されているため、専門知識は不要です。導入時にスタッフ向け操作研修も実施します。" },
    { q: "患者データのセキュリティは大丈夫ですか？", a: "Row-Level Security・管理者認証・セッション管理・SSL/TLS暗号化を実装。個人情報保護法に準拠した運用が可能です。" },
    { q: "契約期間の縛りはありますか？", a: "最低契約期間は6ヶ月です。以降は月単位でのご契約となり、いつでも解約可能です。" },
    { q: "IT導入補助金は使えますか？", a: "対象となる可能性があります。申請サポートも行っておりますので、詳しくはお問い合わせください。" },
  ];
  return (
    <Section id="faq" className="bg-slate-50/50">
      <div className="text-center">
        <Label>FAQ</Label>
        <Title>よくあるご質問</Title>
      </div>
      <div className="mx-auto mt-8 max-w-3xl divide-y divide-slate-200/80">
        {faqs.map((f, i) => (
          <div key={i}>
            <button className="flex w-full items-center justify-between py-5 text-left" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
              <span className="flex items-start gap-3 text-[13px] font-semibold text-slate-700 md:text-[14px]">
                <span className="mt-0.5 shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Q</span>
                {f.q}
              </span>
              <svg className={`ml-3 h-4 w-4 shrink-0 text-slate-400 transition ${openIdx === i ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {openIdx === i && <div className="pb-5 pl-9 text-[13px] leading-relaxed text-slate-400">{f.a}</div>}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════ FINAL CTA ═══ */
function FinalCTA() {
  return (
    <section id="contact" className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 px-5 py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-[1.7rem] font-extrabold leading-snug text-white md:text-4xl">LINE活用で、<br className="md:hidden" />クリニック経営を次のステージへ</h2>
        <p className="mx-auto mb-10 max-w-xl text-[14px] leading-relaxed text-emerald-100">まずは資料請求から。貴院の課題に合わせたデモのご案内も可能です。</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="mailto:info@example.com" className="w-full rounded-xl bg-white px-10 py-4 text-[13px] font-bold text-emerald-700 shadow-lg transition hover:bg-emerald-50 sm:w-auto">資料請求・お問い合わせ</a>
          <a href="#" className="w-full rounded-xl border-2 border-white/25 px-10 py-4 text-[13px] font-bold text-white transition hover:bg-white/10 sm:w-auto">無料オンライン相談を予約</a>
        </div>
        <p className="mt-6 text-[11px] text-emerald-200">※ 無理な営業は一切行いません</p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════ FOOTER ═══ */
function Footer() {
  return (
    <footer className="bg-slate-900 px-5 py-10 text-slate-400">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex items-center gap-2 text-[14px] font-bold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-black text-white">L</span>
            Lオペ for CLINIC
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-[12px]">
            {["機能", "強み", "活用シーン", "料金", "FAQ", "お問い合わせ"].map((l) => (
              <a key={l} href={`#${l === "機能" ? "features" : l === "強み" ? "strengths" : l === "活用シーン" ? "usecases" : l === "料金" ? "pricing" : l === "FAQ" ? "faq" : "contact"}`} className="hover:text-white">{l}</a>
            ))}
          </div>
        </div>
        <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-7 text-[11px] md:flex-row">
          <div className="flex gap-5">
            <a href="#" className="hover:text-white">利用規約</a>
            <a href="#" className="hover:text-white">プライバシーポリシー</a>
            <a href="#" className="hover:text-white">特定商取引法に基づく表記</a>
          </div>
          <p>&copy; 2025 Lオペ for CLINIC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
