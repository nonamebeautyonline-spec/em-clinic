"use client";

import { useState } from "react";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════════════════════
   Lオペ for CLINIC — Landing Page (Blue theme, Full feature showcase)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ──── Shared UI ──── */
function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`px-5 py-24 md:py-32 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-4 inline-block rounded-full bg-blue-50 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-blue-600 uppercase">{children}</span>;
}
function Title({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-slate-900 md:text-4xl lg:text-[2.6rem] ${className}`}>{children}</h2>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <p className="mx-auto mb-16 max-w-2xl text-[15px] leading-relaxed text-slate-400">{children}</p>;
}
function MockWindow({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-[10px] font-medium text-slate-400">{title}</span>
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </div>
  );
}

/* カテゴリヘッダー */
function CategoryHeader({ label, title, desc }: { label: string; title: string; desc: string }) {
  return (
    <div className="mb-12 text-center">
      <span className="mb-3 inline-block rounded-full bg-blue-50 px-4 py-1.5 text-[10px] font-bold tracking-[.18em] text-blue-600 uppercase">{label}</span>
      <h3 className="mb-3 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">{title}</h3>
      <p className="mx-auto max-w-xl text-[14px] leading-relaxed text-slate-400">{desc}</p>
    </div>
  );
}

/* 機能ブロック: 大きめモック + テキスト */
function FeatureBlock({ title, desc, details, children, reverse = false }: {
  title: string; desc: string; details: string[]; children: React.ReactNode; reverse?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-14 ${reverse ? "lg:flex-row-reverse" : ""}`}>
      <div className="w-full lg:w-[58%]">{children}</div>
      <div className="w-full lg:w-[42%] lg:pt-4">
        <h4 className="mb-3 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">{title}</h4>
        <p className="mb-5 text-[14px] leading-[1.9] text-slate-500">{desc}</p>
        <ul className="space-y-2.5">
          {details.map((d) => (
            <li key={d} className="flex items-start gap-2.5 text-[13px] text-slate-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] text-blue-600">&#10003;</span>
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* フル幅モック（テキストは上部） */
function FeatureWide({ title, desc, details, children }: {
  title: string; desc: string; details: string[]; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h4 className="mb-2 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">{title}</h4>
          <p className="max-w-xl text-[14px] leading-[1.9] text-slate-500">{desc}</p>
        </div>
        <ul className="flex flex-wrap gap-3">
          {details.map((d) => (
            <li key={d} className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
              <span className="text-[9px]">&#10003;</span>{d}
            </li>
          ))}
        </ul>
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ PAGE ══ */
export default function LPPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800" style={{ fontFeatureSettings: "'palt'" }}>
      <Nav />
      <Hero />

      <Problems />
      <About />
      <Features />
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
          <Image src="/images/l-ope-logo.png" alt="Lオペ" width={160} height={160} className="object-contain" />
          <span className="text-[15px] font-bold tracking-tight">Lオペ <span className="text-blue-600">for CLINIC</span></span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => <a key={l.href} href={l.href} className="text-[13px] font-medium text-slate-500 transition hover:text-blue-600">{l.label}</a>)}
          <a href="#contact" className="rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-[13px] font-bold text-white shadow-sm shadow-blue-500/20 transition hover:shadow-md">お問い合わせ</a>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="メニュー">
          <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.8}>{open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-white px-5 pb-5 md:hidden">
          {links.map((l) => <a key={l.href} href={l.href} className="block py-3 text-sm text-slate-600" onClick={() => setOpen(false)}>{l.label}</a>)}
          <a href="#contact" className="mt-2 block rounded-lg bg-blue-600 py-3 text-center text-sm font-bold text-white" onClick={() => setOpen(false)}>お問い合わせ</a>
        </div>
      )}
    </nav>
  );
}

/* ══════════════════════════════════════════════════════════════════ HERO ══ */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-[60px]">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50" />
      <div className="pointer-events-none absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-blue-100/40 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-60 -left-40 h-[600px] w-[600px] rounded-full bg-sky-100/30 blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-white/60 px-4 py-1.5 text-[11px] font-semibold text-blue-700 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />クリニック特化 LINE運用プラットフォーム
            </div>
            <h1 className="mb-6 text-[2.2rem] font-extrabold leading-[1.25] tracking-tight md:text-5xl lg:text-[3.2rem]">
              LINE 1つで<br /><span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">クリニック業務</span>を<br />まるごとDX化
            </h1>
            <p className="mb-8 max-w-lg text-[15px] leading-[1.8] text-slate-500">
              患者CRM・セグメント配信・リッチメニュー構築・問診フォーム・予約管理・会計・配送・AI自動返信まで。LINEを起点にクリニック運営のすべてをワンストップで実現します。
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#contact" className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-8 py-3.5 text-[13px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl">無料で資料請求</a>
              <a href="#features" className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-[13px] font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-600">機能を見る</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-[11px] text-slate-400">
              {["初期設定サポート無料", "最短2週間で導入", "IT導入補助金対象"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" />{t}</span>
              ))}
            </div>
          </div>
          <div className="relative">
            <MockWindow title="Lオペ for CLINIC — ダッシュボード">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "本日の予約", val: "24", unit: "件", bg: "bg-blue-50", text: "text-blue-600" },
                  { label: "LINE友だち", val: "1,847", unit: "人", bg: "bg-sky-50", text: "text-sky-600" },
                  { label: "月間売上", val: "3.2", unit: "M", bg: "bg-amber-50", text: "text-amber-600" },
                  { label: "リピート率", val: "68", unit: "%", bg: "bg-violet-50", text: "text-violet-600" },
                ].map((k) => (
                  <div key={k.label} className={`rounded-lg ${k.bg} p-2.5`}>
                    <div className="text-[11px] text-slate-400">{k.label}</div>
                    <div className={`mt-0.5 text-lg font-bold leading-none ${k.text}`}>{k.val}<span className="text-[10px] font-normal text-slate-400">{k.unit}</span></div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="col-span-2 rounded-lg bg-slate-50 p-3">
                  <div className="mb-2 text-[11px] font-semibold text-slate-500">LINE友だち推移（7日間）</div>
                  <div className="flex items-end gap-1" style={{ height: 60 }}>
                    {[35, 42, 38, 55, 48, 62, 70].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-400 to-sky-300" style={{ height: `${h}%` }} />)}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-300"><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span></div>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <div className="text-[11px] font-semibold text-slate-500">対応状況</div>
                    <div className="mt-1.5 space-y-1">
                      {[{ c: "bg-red-400", l: "未対応", n: 3 }, { c: "bg-amber-400", l: "対応中", n: 7 }, { c: "bg-blue-400", l: "完了", n: 18 }].map((s) => (
                        <div key={s.l} className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className={`h-2 w-2 rounded-full ${s.c}`} />{s.l}<span className="ml-auto font-bold">{s.n}</span></div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5">
                    <div className="text-[11px] font-semibold text-blue-600">配信結果</div>
                    <div className="mt-1 text-[10px] text-blue-700">開封率 <span className="font-bold">78.3%</span></div>
                    <div className="text-[10px] text-blue-700">予約CV <span className="font-bold">12.1%</span></div>
                  </div>
                </div>
              </div>
            </MockWindow>
            <div className="absolute -right-3 -bottom-3 rounded-xl border border-blue-100 bg-white px-4 py-2.5 shadow-lg shadow-blue-100/40 md:-right-6 md:-bottom-5">
              <div className="text-[11px] text-slate-400">リマインド自動配信</div>
              <div className="text-[13px] font-bold text-blue-600">24件 送信完了</div>
            </div>
          </div>
        </div>
      </div>
    </section>
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
            <p className="text-[15px] leading-relaxed text-slate-600">{p.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-6 py-2.5 text-[15px] font-semibold text-blue-700">
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
    <Section className="bg-gradient-to-b from-blue-50/40 to-white">
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
          <div key={c.title} className="group rounded-2xl border border-slate-100 bg-white p-8 text-center transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 transition group-hover:from-blue-100 group-hover:to-sky-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={c.icon} /></svg>
            </div>
            <h3 className="mb-2 text-lg font-bold tracking-tight">{c.title}</h3>
            <p className="text-[13px] leading-relaxed text-slate-400">{c.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════ FEATURES ═════════ */
function Features() {
  return (
    <Section id="features" className="bg-slate-50/30">
      <div className="text-center">
        <Label>FEATURES</Label>
        <Title>クリニック運営に必要な<br className="md:hidden" />すべての機能を搭載</Title>
        <Sub>汎用LINEツールにはない、医療現場に最適化された30以上の機能群。AI自動返信・AIカルテ・AIメニュー生成など、AI機能も標準搭載。</Sub>
      </div>

      {/* ── 機能一覧サマリー ── */}
      <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { icon: "🖥️", name: "管理画面", desc: "30以上のメニューを一画面に集約" },
          { icon: "💹", name: "売上管理", desc: "日別・月別KPIをリアルタイム表示" },
          { icon: "💬", name: "LINEトーク", desc: "患者との1対1チャットを管理" },
          { icon: "🤖", name: "AI自動返信", desc: "AIが返信候補を自動生成" },
          { icon: "👥", name: "友だち管理", desc: "タグ・マークで患者CRMを一元化" },
          { icon: "📣", name: "セグメント配信", desc: "属性で絞り込んだ精密配信" },
          { icon: "🔄", name: "ステップシナリオ", desc: "時間差の自動フォロー配信" },
          { icon: "📱", name: "リッチメニュー", desc: "ノーコードでメニュー構築" },
          { icon: "✨", name: "AIメニュー生成", desc: "AIがリッチメニューを自動デザイン" },
          { icon: "📝", name: "フォームビルダー", desc: "問診票・アンケートをGUI作成" },
          { icon: "⚡", name: "アクション自動化", desc: "条件分岐で自動タグ・通知" },
          { icon: "🔀", name: "フロービルダー", desc: "ビジュアルで自動化フローを構築" },
          { icon: "📋", name: "問診フォーム", desc: "ステップ表示で回答率を最大化" },
          { icon: "📅", name: "予約カレンダー", desc: "15分刻みのスロット予約" },
          { icon: "👨‍⚕️", name: "複数医師対応", desc: "医師別の並列スケジュール管理" },
          { icon: "🩺", name: "カルテ管理", desc: "問診・処方履歴を一画面に集約" },
          { icon: "💊", name: "処方タイムライン", desc: "処方歴の推移をグラフで可視化" },
          { icon: "📋", name: "カルテテンプレート", desc: "定型文テンプレートで記入効率化" },
          { icon: "💳", name: "決済管理", desc: "クレカ決済・振込消込を一元化" },
          { icon: "📦", name: "配送管理", desc: "大手配送業者と連携し発送を効率化" },
          { icon: "📦", name: "在庫管理", desc: "入出庫・在庫台帳をリアルタイム管理" },
          { icon: "🛍️", name: "商品マスタ", desc: "商品・価格をまとめて管理" },
          { icon: "📊", name: "ダッシュボード", desc: "経営KPIをリアルタイム可視化" },
          { icon: "🎙️", name: "音声カルテ", desc: "診察音声からSOAPカルテを自動生成" },
          { icon: "⏰", name: "自動リマインド", desc: "予約前日にLINE自動通知" },
          { icon: "🔁", name: "フォローアップ", desc: "診察後の自動フォロー配信" },
          { icon: "📊", name: "NPS調査", desc: "患者満足度をLINEで自動測定" },
          { icon: "🎫", name: "クーポン配信", desc: "LINE限定クーポンを一括配信" },
        ].map((f) => (
          <div key={f.name} className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md">
            <span className="text-2xl">{f.icon}</span>
            <div className="mt-2 text-[13px] font-bold text-slate-800">{f.name}</div>
            <div className="mt-0.5 text-[12px] text-slate-500">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="mt-20 space-y-20">

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* A-1. 管理画面概要 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <CategoryHeader label="管理画面" title="全機能をひと目で把握する管理画面" desc="30以上のメニューを業務カテゴリ別に整理。サイドバーから1クリックで目的の画面へ直行できます。" />

        <FeatureWide title="管理画面レイアウト" desc="左サイドバーに全メニューを集約し、メインエリアに各機能の画面を表示。LINE未読バッジで新着メッセージも即座に把握できます。" details={["30以上のメニュー搭載", "カテゴリ別整理", "未読バッジ対応"]}>
          <MockWindow title="Lオペ for CLINIC — 管理画面">
            <div className="flex gap-0 divide-x divide-slate-700" style={{ minHeight: 340 }}>
              {/* サイドバー */}
              <div className="w-48 shrink-0 rounded-l-lg bg-slate-900 p-3 space-y-2.5">
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-cyan-400 to-blue-500 text-[10px] font-black text-white">L</span><span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-[11px] font-bold text-transparent">Lオペ</span></div>
                {[
                  { cat: "メイン", items: [{ icon: "📊", name: "ダッシュボード", active: true }, { icon: "💹", name: "売上管理" }, { icon: "💬", name: "LINE機能", badge: "3" }] },
                  { cat: "予約・診察", items: [{ icon: "📅", name: "予約リスト" }, { icon: "🔄", name: "再処方リスト" }, { icon: "🗓️", name: "予約管理" }, { icon: "🩺", name: "Drカルテ" }, { icon: "📋", name: "カルテ" }] },
                  { cat: "決済管理", items: [{ icon: "💳", name: "カード決済" }, { icon: "🏦", name: "銀行振込" }, { icon: "🔍", name: "振込照合" }, { icon: "📋", name: "決済マスター" }, { icon: "💸", name: "返金一覧" }] },
                  { cat: "発送管理", items: [{ icon: "📦", name: "本日発送予定" }, { icon: "🏷️", name: "追跡番号付与" }, { icon: "⚙️", name: "配送設定" }, { icon: "📦", name: "在庫" }] },
                ].map((g) => (
                  <div key={g.cat}>
                    <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{g.cat}</div>
                    {g.items.map((item) => (
                      <div key={item.name} className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] transition ${item.active ? "bg-slate-800 font-semibold text-white border-l-2 border-blue-400" : "text-slate-300 hover:bg-slate-800"}`}>
                        <span className="text-[10px]">{item.icon}</span>
                        <span className="truncate">{item.name}</span>
                        {item.badge && <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{item.badge}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {/* メインコンテンツエリア */}
              <div className="flex-1 pl-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-bold text-slate-700">ダッシュボード</span>
                  <span className="text-[11px] text-slate-400">2026年2月20日（木）</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "本日の予約", val: "24件", bg: "bg-blue-50", tc: "text-blue-600" },
                    { label: "LINE友だち", val: "1,847人", bg: "bg-sky-50", tc: "text-sky-600" },
                    { label: "月間売上", val: "¥3.2M", bg: "bg-amber-50", tc: "text-amber-600" },
                    { label: "リピート率", val: "68%", bg: "bg-violet-50", tc: "text-violet-600" },
                  ].map((k) => (
                    <div key={k.label} className={`rounded-lg ${k.bg} p-2`}>
                      <div className="text-[10px] text-slate-400">{k.label}</div>
                      <div className={`text-sm font-bold ${k.tc}`}>{k.val}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <div className="mb-1 text-[11px] font-semibold text-slate-500">月間売上推移</div>
                  <div className="flex items-end gap-1" style={{ height: 70 }}>
                    {[40, 55, 45, 60, 50, 65, 72, 58, 68, 75, 62, 80].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-400 to-sky-300" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-300">{["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"].map((m) => <span key={m}>{m}</span>)}</div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[10px] text-slate-400">対応状況</div>
                    {[{ c: "bg-red-400", l: "未対応", n: "3" }, { c: "bg-amber-400", l: "対応中", n: "7" }, { c: "bg-blue-400", l: "完了", n: "18" }].map((s) => (
                      <div key={s.l} className="flex items-center gap-1 text-[11px] text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${s.c}`} />{s.l}<span className="ml-auto font-semibold">{s.n}</span></div>
                    ))}
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2">
                    <div className="text-[10px] font-semibold text-blue-600">配信結果</div>
                    <div className="mt-0.5 text-[11px] text-blue-700">開封率 <span className="font-bold">78.3%</span></div>
                    <div className="text-[11px] text-blue-700">予約CV <span className="font-bold">12.1%</span></div>
                  </div>
                  <div className="rounded-lg bg-sky-50 p-2">
                    <div className="text-[10px] font-semibold text-sky-600">本日出荷</div>
                    <div className="mt-0.5 text-[11px] text-sky-700">出荷待ち <span className="font-bold">5件</span></div>
                    <div className="text-[11px] text-sky-700">出荷済み <span className="font-bold">12件</span></div>
                  </div>
                </div>
              </div>
            </div>
          </MockWindow>
        </FeatureWide>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* A-2. 売上・分析 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="pt-8" />
        <CategoryHeader label="売上・分析" title="経営データをリアルタイムで可視化" desc="売上推移・LTV分析・コホート分析・商品別ランキングまで、クリニック経営のKPIを多角的に分析。" />

        {/* 売上管理 */}
        <FeatureWide title="売上管理ダッシュボード" desc="日別・月別の売上KPIをリアルタイムで表示。カード決済・銀行振込・返金を自動集計し、日別チャートとLTV分析・コホート分析・商品別売上の4つのタブで多角的に経営データを分析できます。" details={["日別/月別切替", "4分析タブ", "CSV出力", "LTV・コホート分析"]}>
          <MockWindow title="売上管理 — 月次レポート">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-700">2026年2月</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">▼ 月選択</span>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-md border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500">CSV出力</button>
                  <button className="rounded-md border border-blue-200 px-3 py-1 text-[11px] font-semibold text-blue-600">月次詳細入力</button>
                  <button className="rounded-md border border-green-200 px-3 py-1 text-[11px] font-semibold text-green-600">収支表</button>
                </div>
              </div>
              {/* KPIカード */}
              <div className="grid grid-cols-6 gap-2">
                {[
                  { label: "カード決済", val: "¥2,840,000", sub: "128件", bg: "bg-blue-50", tc: "text-blue-600" },
                  { label: "銀行振込", val: "¥820,000", sub: "34件", bg: "bg-green-50", tc: "text-green-600" },
                  { label: "返金", val: "-¥45,000", sub: "3件", bg: "bg-red-50", tc: "text-red-500" },
                  { label: "純売上", val: "¥3,615,000", sub: "", bg: "bg-slate-50", tc: "text-slate-700" },
                  { label: "決済数", val: "162", sub: "カード128/振込34", bg: "bg-violet-50", tc: "text-violet-600" },
                  { label: "顧客単価", val: "¥22,315", sub: "", bg: "bg-amber-50", tc: "text-amber-600" },
                ].map((k) => (
                  <div key={k.label} className={`rounded-lg ${k.bg} p-2.5 text-center`}>
                    <div className="text-[10px] text-slate-400">{k.label}</div>
                    <div className={`text-[13px] font-bold ${k.tc}`}>{k.val}</div>
                    {k.sub && <div className="text-[10px] text-slate-400">{k.sub}</div>}
                  </div>
                ))}
              </div>
              {/* 日別売上グラフ */}
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="mb-2 text-[10px] font-semibold text-slate-500">日別売上推移</div>
                <div className="flex items-end gap-[3px]" style={{ height: 100 }}>
                  {[65, 80, 45, 90, 55, 70, 85, 60, 75, 95, 50, 88, 72, 68, 92, 58, 82, 77, 63, 70].map((h, i) => (
                    <div key={i} className="flex flex-1 flex-col items-stretch gap-[1px]">
                      <div className="rounded-t bg-green-300" style={{ height: `${h * 0.25}%` }} />
                      <div className="rounded-b bg-blue-400" style={{ height: `${h * 0.75}%` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-300"><span>2/1</span><span>2/5</span><span>2/10</span><span>2/15</span><span>2/20</span></div>
                <div className="mt-1 flex gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-400" />カード決済</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-300" />銀行振込</span>
                </div>
              </div>
              {/* 分析タブ */}
              <div>
                <div className="flex gap-1 border-b border-slate-100 pb-1">
                  {["売上推移", "LTV分析", "コホート分析", "商品別"].map((t, i) => (
                    <button key={t} className={`rounded-t-md px-3 py-1.5 text-[10px] font-semibold ${i === 1 ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500" : "text-slate-400"}`}>{t}</button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <div className="rounded-lg bg-blue-50 p-2 text-center"><div className="text-[10px] text-slate-400">平均LTV</div><div className="text-[14px] font-bold text-blue-600">¥67,200</div></div>
                  <div className="rounded-lg bg-sky-50 p-2 text-center"><div className="text-[10px] text-slate-400">平均注文回数</div><div className="text-[14px] font-bold text-sky-600">3.2回</div></div>
                  <div className="rounded-lg bg-violet-50 p-2 text-center"><div className="text-[10px] text-slate-400">総患者数</div><div className="text-[14px] font-bold text-violet-600">584人</div></div>
                  <div className="rounded-lg bg-amber-50 p-2 text-center"><div className="text-[10px] text-slate-400">総売上</div><div className="text-[14px] font-bold text-amber-600">¥39.2M</div></div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <div className="mb-1 text-[11px] font-semibold text-slate-500">LTV分布</div>
                    {[{ range: "¥0-¥20K", pct: 25 }, { range: "¥20K-¥50K", pct: 35 }, { range: "¥50K-¥100K", pct: 28 }, { range: "¥100K+", pct: 12 }].map((b) => (
                      <div key={b.range} className="mt-1 flex items-center gap-2">
                        <span className="w-16 text-[10px] text-slate-400">{b.range}</span>
                        <div className="flex-1 rounded-full bg-slate-200/50" style={{ height: 6 }}><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-sky-400" style={{ width: `${b.pct * 2.5}%` }} /></div>
                        <span className="w-8 text-right text-[10px] font-semibold text-slate-500">{b.pct}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <div className="mb-1 text-[11px] font-semibold text-slate-500">購入回数分布</div>
                    {[{ range: "1回", pct: 32 }, { range: "2回", pct: 28 }, { range: "3-5回", pct: 25 }, { range: "6回+", pct: 15 }].map((b) => (
                      <div key={b.range} className="mt-1 flex items-center gap-2">
                        <span className="w-16 text-[10px] text-slate-400">{b.range}</span>
                        <div className="flex-1 rounded-full bg-slate-200/50" style={{ height: 6 }}><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-pink-400" style={{ width: `${b.pct * 2.5}%` }} /></div>
                        <span className="w-8 text-right text-[10px] font-semibold text-slate-500">{b.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </MockWindow>
        </FeatureWide>

        <FeatureBlock title="リアルタイムダッシュボード" desc="予約数・売上・新規/リピート比率・LINE友だち推移・決済率・来院率など、クリニック経営に必要なKPIをリアルタイムで一覧表示。配信成績（開封率・CTR・CV率）の分析にも対応。" details={["8種類のKPIカード", "商品別売上ランキング", "配信成績の追跡・比較分析"]}>
          <MockWindow title="ダッシュボード — 月次レポート">
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "新規処方", val: "89", unit: "件", change: "+12%", up: true },
                  { label: "再処方", val: "156", unit: "件", change: "+8%", up: true },
                  { label: "決済率", val: "94.2", unit: "%", change: "+2.1", up: true },
                  { label: "来院率", val: "87.5", unit: "%", change: "-1.3", up: false },
                ].map((k) => (
                  <div key={k.label} className="rounded-lg bg-slate-50 p-3">
                    <div className="text-[11px] text-slate-400">{k.label}</div>
                    <div className="mt-0.5 text-lg font-bold text-slate-700">{k.val}<span className="text-[11px] font-normal text-slate-400">{k.unit}</span></div>
                    <div className={`text-[11px] font-semibold ${k.up ? "text-blue-500" : "text-rose-500"}`}>{k.change}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-2 text-[10px] font-semibold text-slate-500">商品別売上（今月）</div>
                  {[
                    { name: "処方薬A 1ヶ月分", amount: "¥1.2M", pct: 38 },
                    { name: "処方薬B 1ヶ月分", amount: "¥980K", pct: 31 },
                    { name: "処方薬C 1ヶ月分", amount: "¥620K", pct: 20 },
                    { name: "その他", amount: "¥350K", pct: 11 },
                  ].map((p) => (
                    <div key={p.name} className="mt-1.5 flex items-center gap-2">
                      <span className="w-28 text-[10px] text-slate-500 truncate">{p.name}</span>
                      <div className="flex-1 rounded-full bg-slate-200/50" style={{ height: 7 }}><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-sky-400" style={{ width: `${p.pct}%` }} /></div>
                      <span className="w-12 text-right text-[10px] font-semibold text-slate-600">{p.amount}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-2 text-[10px] font-semibold text-slate-500">配信成績</div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="rounded-md bg-white p-2 text-center"><div className="text-[10px] text-slate-400">平均開封率</div><div className="text-base font-bold text-blue-600">78.3%</div></div>
                    <div className="rounded-md bg-white p-2 text-center"><div className="text-[10px] text-slate-400">平均CTR</div><div className="text-base font-bold text-sky-600">23.1%</div></div>
                    <div className="rounded-md bg-white p-2 text-center"><div className="text-[10px] text-slate-400">予約CV</div><div className="text-base font-bold text-violet-600">12.4%</div></div>
                  </div>
                  {[
                    { name: "再診促進（2/15）", opened: "82%", ctr: "28%" },
                    { name: "リマインド（2/14）", opened: "91%", ctr: "—" },
                  ].map((d) => (
                    <div key={d.name} className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /><span className="flex-1 truncate">{d.name}</span><span>開封{d.opened}</span><span>CTR{d.ctr}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* NPS調査 & クリック分析 (2カラムグリッド) */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-lg font-extrabold text-slate-900">NPS（患者満足度調査）</h4>
            <p className="mb-4 text-[13px] text-slate-500">LINEで患者満足度を自動調査。NPSスコア・月別推移・コメントを集約し、サービス改善に直結させます。</p>
            <MockWindow title="NPS調査 — レポート">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700">全体NPSスコア</span>
                  <span className="text-xl font-extrabold text-blue-600">+42</span>
                </div>
                <div className="mb-2 grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="rounded bg-emerald-50 p-1.5"><div className="text-slate-400">推奨者</div><div className="font-bold text-emerald-600">58%</div></div>
                  <div className="rounded bg-amber-50 p-1.5"><div className="text-slate-400">中立者</div><div className="font-bold text-amber-600">26%</div></div>
                  <div className="rounded bg-rose-50 p-1.5"><div className="text-slate-400">批判者</div><div className="font-bold text-rose-600">16%</div></div>
                </div>
                <div className="flex items-end gap-0.5" style={{ height: 36 }}>
                  {[35, 38, 40, 42, 39, 45].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-400 to-sky-300" style={{ height: `${h * 1.5}%` }} />)}
                </div>
                <div className="mt-0.5 flex justify-between text-[9px] text-slate-300">{["9月", "10月", "11月", "12月", "1月", "2月"].map((m) => <span key={m}>{m}</span>)}</div>
              </div>
            </MockWindow>
          </div>
          <div>
            <h4 className="mb-2 text-lg font-extrabold text-slate-900">クリック分析</h4>
            <p className="mb-4 text-[13px] text-slate-500">配信メッセージ内のボタン・リンクのクリック率を可視化。どのCTAが効果的かデータで判断できます。</p>
            <MockWindow title="配信分析 — クリック追跡">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700">再診促進キャンペーン</span>
                  <span className="text-[10px] text-slate-400">配信: 245名</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "予約ボタン", clicks: 89, rate: "36.3%" },
                    { label: "料金ページ", clicks: 52, rate: "21.2%" },
                    { label: "LINE問合せ", clicks: 31, rate: "12.7%" },
                  ].map((c) => (
                    <div key={c.label}>
                      <div className="mb-0.5 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">{c.label}</span>
                        <span className="font-bold text-blue-600">{c.rate}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-sky-400" style={{ width: c.rate }} /></div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center text-[10px] text-slate-400">全体CTR: 70.2% / 予約CV: 36.3%</div>
              </div>
            </MockWindow>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* B-3. 問診 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="pt-8" />
        <CategoryHeader label="問診" title="LINE連携のオンライン問診" desc="1問ずつのステップ表示で回答率を最大化。条件分岐・NG判定で禁忌チェックも自動化。" />

        <FeatureBlock title="オンライン問診フォーム" desc="LINE経由で患者に問診フォームを送付。テキスト・ラジオボタン・チェックボックス・ドロップダウンなど多彩な入力形式に対応し、1問ずつ表示するステップ形式で回答率を最大化。NG判定で禁忌チェックも自動化できます。" details={["1問ずつのステップ表示で離脱防止", "テキスト/ラジオ/チェック等5種の入力形式", "条件分岐・NG判定で禁忌チェック自動化"]}>
          <MockWindow title="問診フォーム — 患者入力画面">
            <div className="mx-auto max-w-md space-y-4">
              {/* プログレスバー */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-slate-700">問診</span>
                  <span className="text-[11px] text-slate-400">質問 8 / 25 — 約5分</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400" style={{ width: "32%" }} />
                </div>
              </div>
              {/* 質問カード */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-1 text-[11px] font-semibold text-blue-600">Q8.</div>
                <h3 className="mb-2 text-[14px] font-bold text-slate-800">現在、他のお薬を服用していますか？</h3>
                <p className="mb-4 text-[11px] text-slate-400">サプリメント・漢方薬を含めてお答えください。</p>
                <div className="space-y-2">
                  {[
                    { label: "服用しているお薬はない", checked: false },
                    { label: "内服薬を服用している", checked: true },
                    { label: "サプリメントのみ服用している", checked: false },
                  ].map((o) => (
                    <label key={o.label} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${o.checked ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${o.checked ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                        {o.checked && <span className="text-[11px] text-white">●</span>}
                      </span>
                      <span className={`text-[12px] ${o.checked ? "font-semibold text-blue-700" : "text-slate-600"}`}>{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* 条件分岐で追加表示される質問 */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-amber-600">Q8-1. 追加質問</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">条件表示</span>
                </div>
                <h3 className="mb-2 text-[13px] font-bold text-slate-800">服用しているお薬の名前を教えてください。</h3>
                <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] placeholder:text-slate-300" placeholder="例: ロキソプロフェン、アムロジピンなど" readOnly />
              </div>
              {/* フッターボタン */}
              <div className="flex justify-between pt-2">
                <button className="rounded-lg border border-slate-200 px-6 py-2.5 text-[11px] font-semibold text-slate-500">← 戻る</button>
                <button className="rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 px-8 py-2.5 text-[11px] font-bold text-white shadow-sm">次へ →</button>
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* B-4. 予約 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="pt-8" />
        <CategoryHeader label="予約" title="患者向け予約カレンダー & 管理画面" desc="患者はLINEから15分刻みの空きを確認して予約。管理側は週間ビューで全予約を一覧管理。" />

        {/* 予約カレンダー（患者向け） */}
        <FeatureBlock title="オンライン予約カレンダー" desc="7日間×15分刻みのスロットカレンダーで、患者はLINEから直接予約。○×で空き状況がひと目でわかり、30秒ごとに自動更新で他の患者とのバッティングを防止。予約→確認の2ステップで完結します。" details={["7日間×15分刻みのスロット表示", "30秒自動更新でリアルタイム反映", "2ステップ（選択→確認）で完結"]}>
          <MockWindow title="予約 — 日時選択">
            <div className="space-y-3">
              {/* ステップインジケーター */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">1</span>
                  <span className="text-[10px] font-semibold text-blue-600">日時選択</span>
                </div>
                <div className="h-px w-8 bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-400">2</span>
                  <span className="text-[10px] text-slate-400">予約確認</span>
                </div>
              </div>
              {/* 週ナビ */}
              <div className="flex items-center justify-between">
                <button className="text-[10px] text-blue-500">← 前週</button>
                <span className="text-[11px] font-semibold text-slate-700">2月17日（月）〜 2月23日（日）</span>
                <button className="text-[10px] text-blue-500">翌週 →</button>
              </div>
              {/* カレンダーグリッド */}
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <div className="grid grid-cols-8 gap-px bg-slate-100">
                  <div className="bg-slate-50 p-1.5" />
                  {["月17", "火18", "水19", "木20", "金21", "土22", "日23"].map((d, i) => (
                    <div key={d} className={`p-1.5 text-center text-[11px] font-semibold ${i === 3 ? "bg-blue-50 text-blue-600" : i >= 5 ? "bg-slate-50 text-rose-400" : "bg-slate-50 text-slate-500"}`}>{d}</div>
                  ))}
                </div>
                {["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00"].map((t) => (
                  <div key={t} className="grid grid-cols-8 gap-px border-t border-slate-100">
                    <div className="bg-white px-1.5 py-1 text-[11px] text-slate-400">{t}</div>
                    {[0, 1, 2, 3, 4, 5, 6].map((c) => {
                      const available = !((t === "09:00" && c === 0) || (t === "10:00" && c === 3) || (t === "09:30" && c === 1) || (t === "10:30" && c === 2));
                      const selected = t === "10:00" && c === 0;
                      return (
                        <div key={c} className={`text-center py-1 text-[10px] ${selected ? "bg-blue-100 font-bold text-blue-600" : available ? "bg-white text-pink-500" : "bg-slate-50 text-slate-300"}`}>
                          {selected ? "○" : available ? "○" : "×"}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="bg-white px-2 py-1 text-center text-[10px] text-slate-300">... 23:00まで表示</div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2">
                <span className="text-[10px] text-blue-700">選択中: <span className="font-semibold">2月20日（木）10:00〜</span></span>
                <button className="rounded-md bg-blue-500 px-4 py-1.5 text-[10px] font-bold text-white">予約確認へ</button>
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* 予約管理（admin週間ビュー） */}
        <FeatureBlock title="予約・スケジュール管理" desc="月別・週別の予約カレンダー、複数医師の並列スケジュール管理・休日設定に対応。LINE経由の予約をそのままダッシュボードで管理。医師ごとのフィルタ表示で担当患者を即把握できます。" details={["月 / 週ビュー切り替え", "複数医師の並列予約・医師別フィルタ", "医師別スケジュール・休日設定", "自動リマインド配信"]} reverse>
          <MockWindow title="予約管理 — 週間ビュー">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">2025年2月 第3週</span>
                <div className="flex gap-1"><span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">予約 24件</span><span className="rounded bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-600">完了 18件</span></div>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <div className="grid grid-cols-6 gap-px bg-slate-100">
                  <div className="bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-400">時間</div>
                  {["月 17", "火 18", "水 19", "木 20", "金 21"].map((d) => <div key={d} className="bg-slate-50 px-2 py-2 text-center text-[11px] font-semibold text-slate-500">{d}</div>)}
                </div>
                {["10:00", "11:00", "14:00", "15:00", "16:00"].map((t) => (
                  <div key={t} className="grid grid-cols-6 gap-px border-t border-slate-100">
                    <div className="bg-white px-2 py-2.5 text-[10px] text-slate-400">{t}</div>
                    {[0, 1, 2, 3, 4].map((c) => {
                      const has = (t === "10:00" && c < 3) || (t === "11:00" && c !== 2) || (t === "14:00" && c > 1) || (t === "15:00" && c === 0) || (t === "16:00" && c === 3);
                      return <div key={c} className="bg-white px-1 py-1.5">{has && <div className="rounded bg-blue-50 px-1.5 py-1 text-[11px] leading-tight text-blue-700">予約あり</div>}</div>;
                    })}
                  </div>
                ))}
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* B-5. 診察・対応 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="pt-8" />
        <CategoryHeader label="診察・対応" title="LINEトーク・AI返信・カルテで患者対応" desc="1対1トーク・AI自動返信・カルテ管理・友だちCRMで日常の患者対応を効率化。" />

        {/* LINEトーク — フル幅3カラム */}
        <FeatureWide title="LINEトーク（個別チャット）" desc="患者との1対1チャットを管理。右パネルで個人情報・問診内容・予約・処方歴を確認しながら対応できます。" details={["3カラム管理画面", "患者情報を即確認", "テンプレート送信"]}>
          <MockWindow title="LINE管理 — 個別トーク">
            <div className="flex gap-0 divide-x divide-slate-100" style={{ minHeight: 380 }}>
              {/* 左: 友だちリスト */}
              <div className="w-44 shrink-0 space-y-1 pr-3">
                <input className="mb-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] placeholder:text-slate-300" placeholder="氏名・IDで検索..." readOnly />
                {[
                  { name: "星野 さくら", msg: "ありがとうございます", mark: "bg-red-400", markLabel: "未対応", tags: ["美容", "VIP"], active: true, unread: true },
                  { name: "青山 はるか", msg: "了解しました", mark: "bg-blue-400", markLabel: "完了", tags: ["ダイエット"], active: false, unread: false },
                  { name: "緑川 大輝", msg: "予約したいです", mark: "bg-amber-400", markLabel: "対応中", tags: ["AGA"], active: false, unread: true },
                  { name: "白石 あおい", msg: "お薬届きました", mark: "bg-blue-400", markLabel: "完了", tags: ["美容"], active: false, unread: false },
                ].map((f) => (
                  <div key={f.name} className={`rounded-lg px-2 py-2 cursor-pointer ${f.active ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${f.mark}`} />
                      <span className="text-[10px] font-semibold text-slate-700 truncate">{f.name}</span>
                      {f.unread && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-green-400" />}
                    </div>
                    <div className="mt-0.5 flex gap-1">
                      {f.tags.map((t) => <span key={t} className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-500">{t}</span>)}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400 truncate">{f.msg}</div>
                  </div>
                ))}
              </div>

              {/* 中央: チャット */}
              <div className="flex flex-1 flex-col px-3">
                <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="h-7 w-7 rounded-full bg-slate-200" />
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700">星野 さくら</span>
                    <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono text-blue-600">P-1042</span>
                  </div>
                  <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-500">未対応</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  <div className="text-center text-[10px] text-slate-300">── 2月20日（木）──</div>
                  <div className="flex justify-start"><div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-[11px] text-slate-600">先日の処方薬がそろそろなくなるのですが、再処方の手続きはどうすればいいですか？</div></div>
                  <div className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[#8CE62C] px-3 py-2 text-[11px] text-slate-700">マイページの「再処方申請」からお手続きいただけます。医師確認後、ご決済のご案内をお送りします。</div></div>
                  <div className="flex justify-start"><div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-[11px] text-slate-600">ありがとうございます！前回と同じお薬でお願いできますか？</div></div>
                  <div className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[#8CE62C] px-3 py-2 text-[11px] text-slate-700">承知しました。前回と同じお薬を1ヶ月分で再処方を進めさせていただきます。</div></div>
                  <div className="flex justify-start"><div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-[11px] text-slate-600">よろしくお願いします！</div></div>
                </div>
                <div className="mt-2 flex gap-1.5 border-t border-slate-100 pt-2">
                  <div className="flex gap-1">
                    <button className="rounded-md bg-slate-100 px-2 py-1.5 text-[10px] font-semibold text-slate-500">テンプレ</button>
                    <button className="rounded-md bg-slate-100 px-2 py-1.5 text-[10px] font-semibold text-slate-500">画像</button>
                  </div>
                  <input className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] placeholder:text-slate-300" placeholder="メッセージを入力..." readOnly />
                  <button className="rounded-lg bg-blue-500 px-3 py-1.5 text-[11px] font-bold text-white">送信</button>
                </div>
              </div>

              {/* 右: 患者情報パネル */}
              <div className="w-52 shrink-0 space-y-3 overflow-y-auto pl-3 text-[10px]">
                {/* 個人情報 */}
                <div>
                  <div className="mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">個人情報</div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-slate-400">氏名</span><span className="font-semibold text-slate-700">星野 さくら</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">カナ</span><span className="text-slate-600">タナカ ミサキ</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">性別</span><span className="text-slate-600">女性</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">生年月日</span><span className="text-slate-600">1993/5/12（32歳）</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">TEL</span><span className="font-mono text-slate-600">090-1234-5678</span></div>
                  </div>
                </div>
                {/* 次回予約 */}
                <div>
                  <div className="mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">次回予約</div>
                  <div className="rounded-md bg-blue-50 px-2 py-1.5 text-[10px] font-semibold text-blue-700">2/24（月）10:00〜</div>
                </div>
                {/* タグ */}
                <div>
                  <div className="mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">タグ</div>
                  <div className="flex flex-wrap gap-1">
                    <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-700">美容</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">VIP</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">リピーター</span>
                  </div>
                </div>
                {/* 問診事項 */}
                <div>
                  <div className="mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">問診事項</div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-slate-400">既往歴</span><span className="text-slate-600">なし</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">GLP-1</span><span className="text-slate-600">使用歴なし</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">内服</span><span className="text-slate-600">なし</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">アレルギー</span><span className="text-slate-600">なし</span></div>
                  </div>
                </div>
                {/* 最新決済 */}
                <div>
                  <div className="mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">最新決済</div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-slate-400">商品</span><span className="text-slate-600">処方薬A 1ヶ月分</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">金額</span><span className="font-semibold text-slate-700">¥13,000</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">決済</span><span className="text-slate-600">クレジットカード</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">追跡</span><span className="font-mono text-blue-600">4912-3456-7890</span></div>
                  </div>
                </div>
                {/* 処方履歴 */}
                <div>
                  <div className="mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">処方履歴</div>
                  <div className="space-y-1">
                    {[
                      { date: "2/15", product: "処方薬A×1ヶ月" },
                      { date: "1/10", product: "処方薬A×1ヶ月" },
                      { date: "12/5", product: "初回処方 2.5mg" },
                    ].map((h) => (
                      <div key={h.date} className="flex items-center gap-2">
                        <span className="text-slate-400">{h.date}</span>
                        <span className="text-slate-600 truncate">{h.product}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </MockWindow>
        </FeatureWide>

        {/* AI自動返信 */}
        <FeatureBlock title="AI自動返信" desc="AIが患者からの問い合わせ内容を理解し、クリニックのFAQ・処方情報・予約状況を踏まえた返信文を自動生成。スタッフが確認・修正してから送信するフローで品質を担保しつつ、対応時間を最大80%短縮します。営業時間外の自動送信モードにも対応。" details={["AIが文脈を理解して返信文を自動生成", "修正指示→再生成のループ対応", "スタッフ確認後に送信（自動送信モードも可）", "AI返信統計で自動返信の精度を可視化"]} reverse>
          <MockWindow title="AI返信 — 返信候補">
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-[10px] font-semibold text-slate-400">患者メッセージ</div>
                <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] text-slate-600">先日の処方薬がそろそろなくなるのですが、再処方の手続きはどうすればいいですか？</div>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px]">🤖</span>
                  <span className="text-[11px] font-semibold text-blue-700">AI生成返信</span>
                  <span className="ml-auto rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600">生成完了</span>
                </div>
                <div className="rounded-md bg-white p-3 text-[12px] leading-relaxed text-slate-600">
                  お問い合わせありがとうございます。再処方のお手続きは、LINEメニューの「マイページ」から「再処方申請」をタップしていただくと、簡単にお手続きいただけます。医師が確認後、ご決済のご案内をお送りいたします。ご不明点がございましたらお気軽にお申し付けください。
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[11px] font-semibold text-slate-500">修正指示</button>
                <button className="flex-1 rounded-lg bg-blue-500 py-2.5 text-[11px] font-bold text-white">このまま送信</button>
                <button className="rounded-lg border border-slate-200 px-4 py-2.5 text-[11px] text-slate-400">却下</button>
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* 音声カルテ自動生成 */}
        <FeatureBlock title="音声カルテ自動生成" desc="診察中の会話をワンタップで録音。AIが音声を文字起こしし、SOAP形式のカルテを自動生成します。薬剤名・症状名を自動抽出し、定型文テンプレートとも組み合わせ可能。カルテ作成時間を1件あたり数分に短縮します。" details={["SOAP形式でカルテ自動生成", "医療用語・薬剤名の自動抽出", "カルテテンプレートとの連携", "診療科別の専門辞書に対応"]}>
          <MockWindow title="音声カルテ — SOAP生成">
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[14px]">🎙️</span>
                <div className="flex-1"><div className="text-[11px] font-semibold text-blue-700">音声文字起こし完了</div><div className="text-[10px] text-blue-500">診察時間: 5分32秒</div></div>
                <span className="rounded-full bg-blue-500 px-2.5 py-0.5 text-[10px] font-bold text-white">生成済み</span>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 text-[11px] font-bold text-slate-700">SOAPカルテ</div>
                <div className="space-y-2 text-[11px]">
                  <div><span className="mr-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">S</span><span className="text-slate-600">肌荒れが気になる。2週間前から赤みが出てきた。</span></div>
                  <div><span className="mr-1.5 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">O</span><span className="text-slate-600">両頬に紅斑あり。乾燥傾向。</span></div>
                  <div><span className="mr-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">A</span><span className="text-slate-600">接触性皮膚炎の疑い。</span></div>
                  <div><span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">P</span><span className="text-slate-600">外用薬を処方。2週間後に再診。</span></div>
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold text-slate-400">抽出された医療用語</div>
                <div className="flex flex-wrap gap-1">
                  {["紅斑", "接触性皮膚炎", "外用薬"].map((t) => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{t}</span>)}
                </div>
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* カルテ管理 */}
        <FeatureBlock title="カルテ管理" desc="患者の問診情報・医療情報・処方履歴を一画面に集約。Dr.ノートでは定型文テンプレートを使い効率的にカルテを記入でき、同時編集ロック機能で複数スタッフの競合を防止。処方歴タイムラインで増量・減量・同量の推移もグラフで可視化します。" details={["処方歴タイムラインで用量推移を可視化", "テンプレート管理（バージョン管理・差分表示・旧版復元）", "同時編集ロックで複数スタッフの競合を防止", "購入履歴・再処方履歴も即確認"]}>
          <MockWindow title="カルテ — 患者詳細">
            <div className="flex gap-0 divide-x divide-slate-100" style={{ minHeight: 320 }}>
              {/* 左: 患者基本情報 */}
              <div className="w-40 shrink-0 pr-3">
                <div className="mb-2 rounded-lg bg-blue-600 px-3 py-2.5 text-center text-white">
                  <div className="text-[12px] font-bold">星野 さくら</div>
                  <div className="text-[11px] text-blue-200">タナカ ミサキ</div>
                  <div className="mt-1 flex justify-center gap-1">
                    <span className="rounded bg-blue-500 px-1.5 py-0.5 text-[10px]">女性</span>
                    <span className="rounded bg-blue-500 px-1.5 py-0.5 text-[10px]">32歳</span>
                    <span className="rounded bg-green-500 px-1.5 py-0.5 text-[10px]">LINE ✓</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-slate-400">PID</span><span className="font-mono text-slate-600">P-1042</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">TEL</span><span className="font-mono text-slate-600">090-1234-5678</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">生年月日</span><span className="text-slate-600">1993/5/12</span></div>
                </div>
                <button className="mt-3 w-full rounded-md bg-blue-50 py-1.5 text-[11px] font-semibold text-blue-600">患者詳細</button>
                <div className="mt-3 text-[10px] font-semibold text-slate-400">経過写真</div>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((n) => <div key={n} className="aspect-square rounded bg-slate-100" />)}
                </div>
              </div>
              {/* 右: カルテ内容 */}
              <div className="flex-1 pl-3 space-y-2">
                <div className="flex gap-1 mb-2">
                  <button className="rounded-md bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600">問診・カルテ</button>
                  <button className="rounded-md bg-slate-50 px-3 py-1 text-[11px] text-slate-400">購入履歴</button>
                  <button className="rounded-md bg-slate-50 px-3 py-1 text-[11px] text-slate-400">再処方</button>
                </div>
                {/* カルテアコーディオン */}
                <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold text-slate-700">2/15 初回問診</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">OK</span>
                    <span className="text-[10px] text-slate-400">処方薬A 1ヶ月分</span>
                    <span className="ml-auto text-[10px] text-slate-400">🔓 ロック中</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-white p-2">
                      <div className="mb-1 text-[10px] font-bold text-slate-400">医療情報</div>
                      <div className="space-y-0.5 text-[11px]">
                        <div className="flex justify-between"><span className="text-slate-400">既往歴</span><span className="text-slate-600">なし</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">GLP-1</span><span className="text-slate-600">使用歴なし</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">内服薬</span><span className="text-slate-600">なし</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">アレルギー</span><span className="text-slate-600">なし</span></div>
                      </div>
                    </div>
                    <div className="rounded-md bg-white p-2">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400">DR. NOTE</span>
                        <span className="text-[10px] text-blue-500">定型文▼</span>
                      </div>
                      <div className="rounded border border-slate-100 bg-slate-50 p-1.5 text-[11px] text-slate-600">副作用がなく、継続使用のため処方。処方薬A×1ヶ月分。</div>
                      <div className="mt-1 flex gap-1">
                        {["一般", "GLP-1", "計測"].map((t) => <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{t}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-700">1/10 再処方</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">OK</span>
                    <span className="text-[10px] text-slate-400">処方薬A 1ヶ月分</span>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-700">12/5 初回処方</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">OK</span>
                    <span className="text-[10px] text-slate-400">処方薬A 1ヶ月分</span>
                  </div>
                </div>
                {/* 処方歴タイムライン */}
                <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-2.5">
                  <div className="mb-1.5 text-[10px] font-bold text-violet-600">処方タイムライン</div>
                  <div className="flex items-end gap-1" style={{ height: 40 }}>
                    {[
                      { h: 25, label: "2.5mg", color: "bg-blue-300" },
                      { h: 50, label: "5mg", color: "bg-blue-400" },
                      { h: 50, label: "5mg", color: "bg-blue-400" },
                      { h: 75, label: "7.5mg", color: "bg-blue-500" },
                    ].map((b, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className={`w-full rounded-t ${b.color}`} style={{ height: `${b.h}%` }} />
                        <span className="mt-0.5 text-[8px] text-slate-400">{b.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-0.5 flex justify-between text-[8px] text-slate-300">
                    <span>12/5</span><span>1/10</span><span>2/10</span><span>3/10</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[9px]">
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">↑ 増量</span>
                    <span className="text-slate-400">副作用なし・効果感じづらく増量</span>
                  </div>
                </div>
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* 友だち管理 */}
        <FeatureBlock title="友だち管理（患者CRM）" desc="患者にカラータグ・対応マーク・カスタム情報フィールドを設定し、LINE CRMとして一元管理。名前・電話番号・タグでの横断検索で、必要な患者情報にすぐアクセスできます。" details={["タグ・対応マーク・カスタムフィールド", "複合条件での高速検索", "一括タグ操作・CSV出力"]} reverse>
          <MockWindow title="LINE管理 — 友だち管理">
            <div className="space-y-2">
              <div className="flex gap-2">
                <input className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] placeholder:text-slate-300" placeholder="名前・ID・電話番号で検索..." readOnly />
                <button className="rounded-md bg-blue-500 px-4 py-2 text-[10px] font-bold text-white">検索</button>
              </div>
              {[
                { name: "星野 さくら", mark: "bg-red-400", markLabel: "未対応", tags: [{ l: "初診", c: "bg-blue-100 text-blue-700" }, { l: "美容", c: "bg-pink-100 text-pink-700" }, { l: "VIP", c: "bg-amber-100 text-amber-700" }], lastVisit: "2/15", tel: "090-1234-5678" },
                { name: "青山 はるか", mark: "bg-blue-400", markLabel: "完了", tags: [{ l: "ダイエット", c: "bg-orange-100 text-orange-700" }, { l: "リピーター", c: "bg-violet-100 text-violet-700" }], lastVisit: "2/10", tel: "080-2345-6789" },
                { name: "緑川 大輝", mark: "bg-amber-400", markLabel: "対応中", tags: [{ l: "AGA", c: "bg-sky-100 text-sky-700" }, { l: "新規", c: "bg-slate-100 text-slate-600" }], lastVisit: "2/18", tel: "070-3456-7890" },
                { name: "白石 あおい", mark: "bg-blue-400", markLabel: "完了", tags: [{ l: "ダイエット", c: "bg-orange-100 text-orange-700" }, { l: "VIP", c: "bg-amber-100 text-amber-700" }], lastVisit: "2/12", tel: "090-4567-8901" },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 transition hover:bg-slate-50/50">
                  <span className="h-9 w-9 shrink-0 rounded-full bg-slate-200" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-slate-700">{p.name}</span>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.mark === "bg-red-400" ? "bg-red-50 text-red-500" : p.mark === "bg-amber-400" ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-500"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${p.mark}`} />{p.markLabel}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.tags.map((t) => <span key={t.l} className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${t.c}`}>{t.l}</span>)}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 shrink-0">
                    <div>最終来院: {p.lastVisit}</div>
                    <div className="font-mono">{p.tel}</div>
                  </div>
                </div>
              ))}
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* B-6. 決済・配送 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="pt-8" />
        <CategoryHeader label="決済・配送" title="クレカ・振込の決済から配送管理まで" desc="クレジットカード決済、銀行振込の消込、配送管理をワンストップで。" />

        {/* 決済管理 — フル幅 */}
        <FeatureWide title="決済管理（クレジットカード・銀行振込）" desc="クレジットカード決済・銀行振込の消込処理・返金管理まで、クリニックの金流を一元管理。日別・月別レポートで経営判断を支援します。" details={["クレカ連携", "振込消込", "返金処理", "日次レポート"]}>
          <MockWindow title="会計管理 — 決済ダッシュボード">
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg bg-blue-50 p-3 text-center"><div className="text-[11px] text-slate-400">カード決済</div><div className="text-xl font-bold text-blue-600">¥2.4M</div></div>
                <div className="rounded-lg bg-sky-50 p-3 text-center"><div className="text-[11px] text-slate-400">銀行振込</div><div className="text-xl font-bold text-sky-600">¥820K</div></div>
                <div className="rounded-lg bg-violet-50 p-3 text-center"><div className="text-[11px] text-slate-400">コンビニ支払</div><div className="text-xl font-bold text-violet-600">¥150K</div></div>
                <div className="rounded-lg bg-amber-50 p-3 text-center"><div className="text-[11px] text-slate-400">返金額</div><div className="text-xl font-bold text-amber-600">¥35K</div></div>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <div className="grid grid-cols-6 gap-px bg-slate-100">
                  {["患者名", "商品", "金額", "決済方法", "ステータス", "日時"].map((h) => <div key={h} className="bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">{h}</div>)}
                </div>
                {[
                  { name: "星野 さくら", product: "処方薬A×1ヶ月", amount: "¥13,000", method: "クレジットカード", status: "決済完了", sc: "text-blue-600 bg-blue-50", date: "2/20 14:23" },
                  { name: "青山 はるか", product: "処方薬B×2ヶ月", amount: "¥45,500", method: "銀行振込", status: "消込待ち", sc: "text-amber-600 bg-amber-50", date: "2/20 11:05" },
                  { name: "緑川 大輝", product: "処方薬A×3ヶ月", amount: "¥35,000", method: "クレジットカード", status: "決済完了", sc: "text-blue-600 bg-blue-50", date: "2/19 16:42" },
                  { name: "白石 あおい", product: "処方薬B×1ヶ月", amount: "¥22,850", method: "コンビニ", status: "入金済み", sc: "text-violet-600 bg-violet-50", date: "2/19 09:18" },
                ].map((tx) => (
                  <div key={tx.name + tx.date} className="grid grid-cols-6 gap-px border-t border-slate-100">
                    <div className="flex items-center gap-1.5 bg-white px-3 py-2.5"><span className="h-5 w-5 shrink-0 rounded-full bg-slate-200" /><span className="text-[10px] font-medium text-slate-700">{tx.name}</span></div>
                    <div className="bg-white px-3 py-2.5 text-[10px] text-slate-600">{tx.product}</div>
                    <div className="bg-white px-3 py-2.5 text-[11px] font-bold text-slate-700">{tx.amount}</div>
                    <div className="bg-white px-3 py-2.5 text-[10px] text-slate-500">{tx.method}</div>
                    <div className="bg-white px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tx.sc}`}>{tx.status}</span></div>
                    <div className="bg-white px-3 py-2.5 text-[10px] text-slate-400">{tx.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </MockWindow>
        </FeatureWide>

        {/* 配送管理 — フル幅 */}
        <FeatureWide title="配送・発送管理" desc="大手配送業者のCSV形式で発送ラベルを一括作成。日本郵便やヤマト運輸などに対応。追跡番号を登録すると患者へ自動でLINE通知。配送ステータスの一元管理で発送漏れを防止します。" details={["配送CSV出力", "追跡番号付与", "LINE自動通知", "ステータス管理"]}>
          <MockWindow title="配送管理 — 本日の出荷リスト">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700">出荷待ち: 5件</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">出荷済み: 12件</span>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-semibold text-sky-700">配達完了: 8件</span>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-md bg-blue-500 px-4 py-1.5 text-[10px] font-bold text-white">配送CSV出力</button>
                  <button className="rounded-md border border-slate-200 px-4 py-1.5 text-[10px] font-semibold text-slate-600">追跡番号一括登録</button>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <div className="grid grid-cols-6 gap-px bg-slate-100">
                  {["患者名", "商品", "配送先", "追跡番号", "ステータス", "操作"].map((h) => <div key={h} className="bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">{h}</div>)}
                </div>
                {[
                  { name: "星野 さくら", product: "処方薬A 1ヶ月分", addr: "東京都渋谷区...", tracking: "—", status: "出荷待ち", sc: "text-amber-600 bg-amber-50" },
                  { name: "青山 はるか", product: "処方薬B 1ヶ月分", addr: "大阪府大阪市...", tracking: "4912-3456-7890", status: "出荷済み", sc: "text-blue-600 bg-blue-50" },
                  { name: "朝日 翔太", product: "処方薬A 1ヶ月分", addr: "愛知県名古屋市...", tracking: "4912-1234-5678", status: "配達完了", sc: "text-sky-600 bg-sky-50" },
                  { name: "白石 あおい", product: "処方薬C 1ヶ月分", addr: "福岡県福岡市...", tracking: "—", status: "出荷待ち", sc: "text-amber-600 bg-amber-50" },
                ].map((s) => (
                  <div key={s.name} className="grid grid-cols-6 gap-px border-t border-slate-100">
                    <div className="flex items-center gap-1.5 bg-white px-3 py-2.5"><span className="h-5 w-5 shrink-0 rounded-full bg-slate-200" /><span className="text-[10px] font-medium text-slate-700">{s.name}</span></div>
                    <div className="bg-white px-3 py-2.5 text-[10px] text-slate-600">{s.product}</div>
                    <div className="bg-white px-3 py-2.5 text-[10px] text-slate-500">{s.addr}</div>
                    <div className="bg-white px-3 py-2.5 text-[10px] font-mono text-blue-600">{s.tracking}</div>
                    <div className="bg-white px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.sc}`}>{s.status}</span></div>
                    <div className="bg-white px-3 py-2.5">{s.tracking === "—" ? <button className="text-[11px] font-semibold text-blue-500">追跡番号入力</button> : <button className="text-[11px] font-semibold text-slate-400">LINE通知済</button>}</div>
                  </div>
                ))}
              </div>
            </div>
          </MockWindow>
        </FeatureWide>

        {/* 在庫管理 */}
        <FeatureBlock title="在庫管理・在庫台帳" desc="処方薬・消耗品の在庫をリアルタイムで把握。入出庫の自動記録に加え、在庫台帳で過去の推移を可視化。発注判断に必要な情報をワンストップで提供します。" details={["入出庫の自動記録・履歴管理", "在庫台帳で推移をグラフ可視化", "商品マスタと連動した一元管理"]} reverse>
          <MockWindow title="在庫管理 — 現在庫">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "総SKU数", val: "24", bg: "bg-blue-50", tc: "text-blue-600" },
                  { label: "要発注", val: "3", bg: "bg-amber-50", tc: "text-amber-600" },
                  { label: "在庫切れ", val: "0", bg: "bg-emerald-50", tc: "text-emerald-600" },
                ].map((k) => (
                  <div key={k.label} className={`rounded-lg ${k.bg} p-2.5 text-center`}>
                    <div className="text-[10px] text-slate-400">{k.label}</div>
                    <div className={`text-lg font-bold ${k.tc}`}>{k.val}</div>
                  </div>
                ))}
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <div className="grid grid-cols-5 gap-px bg-slate-100">
                  {["商品名", "現在庫", "入庫", "出庫", "ステータス"].map((h) => <div key={h} className="bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-500">{h}</div>)}
                </div>
                {[
                  { name: "処方薬A 1ヶ月分", stock: "120", inb: "+50", out: "-38", status: "適正", sc: "text-emerald-600 bg-emerald-50" },
                  { name: "処方薬B 1ヶ月分", stock: "45", inb: "+30", out: "-22", status: "適正", sc: "text-emerald-600 bg-emerald-50" },
                  { name: "処方薬C 3ヶ月分", stock: "8", inb: "—", out: "-5", status: "要発注", sc: "text-amber-600 bg-amber-50" },
                ].map((r) => (
                  <div key={r.name} className="grid grid-cols-5 gap-px border-t border-slate-100">
                    <div className="bg-white px-2 py-1.5 text-[10px] font-medium text-slate-700">{r.name}</div>
                    <div className="bg-white px-2 py-1.5 text-[10px] font-bold text-slate-700">{r.stock}</div>
                    <div className="bg-white px-2 py-1.5 text-[10px] text-emerald-600">{r.inb}</div>
                    <div className="bg-white px-2 py-1.5 text-[10px] text-rose-500">{r.out}</div>
                    <div className="bg-white px-2 py-1.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.sc}`}>{r.status}</span></div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <div className="mb-1 text-[10px] font-semibold text-slate-500">在庫推移（過去30日）</div>
                <div className="flex items-end gap-1" style={{ height: 40 }}>
                  {[80, 75, 70, 82, 78, 65, 90, 85, 80, 72, 68, 88].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-400 to-sky-300" style={{ height: `${h}%` }} />)}
                </div>
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* 商品マスタ管理 */}
        <FeatureBlock title="商品マスタ管理" desc="処方薬・施術メニュー・消耗品の商品情報をまとめて管理。価格・在庫連動・決済連携設定まで、商品に関するすべてのデータを一元管理します。" details={["商品名・価格・カテゴリを一括管理", "在庫管理・決済との自動連動", "商品別の売上分析にも対応"]}>
          <MockWindow title="商品マスタ — 一覧">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">登録商品</span>
                <span className="rounded bg-blue-500 px-3 py-1 text-[10px] font-bold text-white">+ 新規登録</span>
              </div>
              {[
                { name: "処方薬A 1ヶ月分", cat: "処方薬", price: "¥13,000", stock: "120" },
                { name: "処方薬B 2ヶ月分", cat: "処方薬", price: "¥45,500", stock: "45" },
                { name: "処方薬C 3ヶ月分", cat: "処方薬", price: "¥35,000", stock: "8" },
                { name: "初診カウンセリング", cat: "施術", price: "¥5,000", stock: "—" },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-700">{p.name}</div>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{p.cat}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="font-bold text-slate-700">{p.price}</span>
                    <span className="text-slate-400">在庫: {p.stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* C-7. 配信 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="pt-8" />
        <CategoryHeader label="配信" title="セグメント配信 & 自動シナリオ" desc="タグ・属性で精密に絞り込んだ配信と、時間差のステップシナリオで再診促進を自動化。" />

        {/* セグメント配信 */}
        <FeatureBlock title="セグメント配信" desc="タグ・マーク・友だち情報の組み合わせで配信対象を精密に絞り込み。「再診促進は3ヶ月未受診の美容タグ患者のみ」といった高度なターゲティングが可能です。" details={["複数条件の AND/OR 組み合わせ", "除外条件・配信前プレビュー", "予約送信・A/Bテスト対応"]}>
          <MockWindow title="LINE管理 — セグメント配信">
            <div className="space-y-3">
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700">絞り込み条件</div>
              <div className="space-y-2 rounded-lg border border-slate-100 p-3">
                <div className="flex items-center gap-2"><span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">タグ</span><span className="text-[12px] text-slate-600">美容・スキンケア</span><span className="text-[11px] text-slate-400">を含む</span></div>
                <div className="flex items-center gap-2"><span className="rounded bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">AND</span><span className="rounded bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">マーク</span><span className="text-[12px] text-slate-600">完了</span></div>
                <div className="flex items-center gap-2"><span className="rounded bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">AND</span><span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">情報欄</span><span className="text-[12px] text-slate-600">最終来院日 &lt; 90日前</span></div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">配信プレビュー</span>
                  <div className="flex gap-3 text-[10px]"><span className="font-bold text-blue-600">配信可: 67名</span><span className="text-slate-400">UID無し: 4名</span></div>
                </div>
                <div className="mt-2 space-y-1">
                  {["星野 さくら", "青山 はるか", "花園 みなみ"].map((n) => (
                    <div key={n} className="flex items-center gap-2 text-[11px] text-slate-500"><span className="h-5 w-5 rounded-full bg-slate-200" />{n}<span className="ml-auto rounded bg-pink-50 px-1.5 py-0.5 text-[10px] text-pink-500">美容</span></div>
                  ))}
                  <div className="text-center text-[11px] text-slate-300">...他 64名</div>
                </div>
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* ステップシナリオ */}
        <FeatureBlock title="ステップシナリオ" desc="友だち追加後のフォローアップや再診促進を、時間差のステップ配信で自動化。条件分岐にも対応し、患者の状態に応じた最適なメッセージを自動送信します。" details={["時間差でメッセージを自動配信", "条件分岐（タグ・マーク・回答状況）", "配信成績のリアルタイム追跡"]} reverse>
          <MockWindow title="LINE管理 — ステップシナリオ">
            <div className="space-y-1">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">新患フォローアップ</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600">稼働中</span>
              </div>
              {[
                { time: "友だち追加直後", action: "挨拶メッセージ送信", icon: "💬", color: "border-blue-200 bg-blue-50", sent: "1,234件" },
                { time: "1日後", action: "初回問診フォームを案内", icon: "📋", color: "border-sky-200 bg-sky-50", sent: "1,180件" },
                { time: "3日後（条件: 未回答）", action: "リマインドメッセージ送信", icon: "🔔", color: "border-amber-200 bg-amber-50", sent: "342件" },
                { time: "7日後（条件: 回答済み）", action: "タグ「問診完了」付与 + メニュー切替", icon: "🏷️", color: "border-violet-200 bg-violet-50", sent: "892件" },
                { time: "14日後", action: "予約促進メッセージ送信", icon: "📅", color: "border-blue-200 bg-blue-50", sent: "756件" },
              ].map((s, i) => (
                <div key={s.time}>
                  <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${s.color}`}>
                    <span className="text-base">{s.icon}</span>
                    <div className="flex-1"><div className="text-[11px] text-slate-400">{s.time}</div><div className="text-[11px] font-semibold text-slate-700">{s.action}</div></div>
                    <span className="text-[11px] text-slate-400">{s.sent}</span>
                  </div>
                  {i < 4 && <div className="ml-5 flex h-3 items-center"><div className="h-full w-px bg-slate-200" /></div>}
                </div>
              ))}
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* 自動リマインド */}
        <FeatureBlock title="自動リマインド配信" desc="予約前日にLINEで自動リマインドを送信。電話によるリマインド業務をゼロに。送信タイミング（X時間前・X日前）やメッセージテンプレートを柔軟に設定できます。" details={["予約X時間前・X日前で設定可能", "テンプレート変数（氏名・日時）対応", "送信結果のリアルタイム追跡"]}>
          <MockWindow title="LINE管理 — リマインドルール">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2.5">
                <span className="text-[11px] font-semibold text-blue-700">前日リマインド（18:00送信）</span>
                <span className="rounded-full bg-blue-500 px-2.5 py-0.5 text-[10px] font-bold text-white">有効</span>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-1 text-[10px] font-semibold text-slate-400">メッセージテンプレート</div>
                <div className="rounded bg-slate-50 p-2.5 text-[11px] text-slate-600">
                  {"{name}"}様、明日 {"{date}"} {"{time}"} にご予約をいただいております。ご来院をお待ちしております。
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[{ l: "今月送信数", v: "487件", c: "text-blue-600" }, { l: "送信成功率", v: "98.2%", c: "text-emerald-600" }, { l: "キャンセル率", v: "-32%", c: "text-rose-500" }].map((s) => (
                  <div key={s.l} className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[9px] text-slate-400">{s.l}</div>
                    <div className={`text-[13px] font-bold ${s.c}`}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* キーワード自動返信 */}
        <FeatureBlock title="キーワード自動返信" desc="患者が特定のキーワードを送信すると、設定したテンプレートで即座に自動返信。「予約」「料金」などのよくある質問への対応を24時間自動化します。" details={["完全一致・部分一致・正規表現対応", "テンプレートメッセージを即時返信", "営業時間外の自動対応に最適"]} reverse>
          <MockWindow title="LINE管理 — キーワード返信">
            <div className="space-y-2">
              {[
                { kw: "予約", match: "部分一致", reply: "ご予約はこちらから承ります → [予約ページURL]", active: true },
                { kw: "料金", match: "部分一致", reply: "料金プランの詳細はこちら → [料金ページURL]", active: true },
                { kw: "営業時間", match: "部分一致", reply: "診療時間: 平日 10:00〜19:00 / 土日祝休", active: true },
              ].map((k) => (
                <div key={k.kw} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">{k.kw}</span>
                    <span className="text-[10px] text-slate-400">{k.match}</span>
                    <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">有効</span>
                  </div>
                  <div className="rounded bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500">{k.reply}</div>
                </div>
              ))}
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* クーポン配信 */}
        <FeatureBlock title="クーポン配信" desc="LINE限定クーポンを一括作成・セグメント配信。有効期限・利用回数の管理から利用実績の追跡まで、販促施策をワンストップで運用できます。" details={["有効期限・利用回数制限", "セグメント別の個別配信", "利用実績のリアルタイム追跡"]}>
          <MockWindow title="LINE管理 — クーポン管理">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">配信中のクーポン</span>
                <span className="rounded bg-blue-500 px-3 py-1 text-[10px] font-bold text-white">+ 新規作成</span>
              </div>
              {[
                { name: "初回限定 20%OFF", exp: "2026/3/31", used: "34/100", status: "配信中", sc: "text-blue-600 bg-blue-50" },
                { name: "再来院 ¥3,000引き", exp: "2026/3/15", used: "67/200", status: "配信中", sc: "text-blue-600 bg-blue-50" },
                { name: "友だち紹介 10%OFF", exp: "2026/2/28", used: "12/50", status: "終了間近", sc: "text-amber-600 bg-amber-50" },
              ].map((c) => (
                <div key={c.name} className="rounded-lg border border-slate-100 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-slate-700">{c.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.sc}`}>{c.status}</span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-slate-400">
                    <span>有効期限: {c.exp}</span>
                    <span>利用: {c.used}</span>
                  </div>
                </div>
              ))}
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* C-8. ノーコード構築 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="pt-8" />
        <CategoryHeader label="ノーコード構築" title="エンジニア不要で現場完結" desc="リッチメニュー・フォーム・自動アクションをGUI操作で構築。開発依頼ゼロで即反映。" />

        {/* リッチメニュー */}
        <FeatureBlock title="リッチメニュービルダー" desc="ドラッグ操作でLINEリッチメニューのボタン配置を自由に設計。各ボタンにURL・電話・テンプレート送信・タグ操作・メニュー切替などのアクションを設定でき、条件に応じた自動切替ルールにも対応します。" details={["ビジュアルエディタで直感配置", "1ボタンに複数アクション設定", "条件分岐によるメニュー自動切替"]}>
          <MockWindow title="LINE管理 — リッチメニュー編集">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">メニュープレビュー</span>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">ドラッグで範囲選択</span>
                </div>
                <div className="grid grid-cols-3 grid-rows-2 gap-[2px] overflow-hidden rounded-lg border border-slate-200">
                  {[
                    { label: "予約する", bg: "bg-blue-100 text-blue-700", selected: true },
                    { label: "問診票", bg: "bg-sky-100 text-sky-700", selected: false },
                    { label: "お知らせ", bg: "bg-amber-100 text-amber-700", selected: false },
                    { label: "マイページ", bg: "bg-violet-100 text-violet-700", selected: false },
                    { label: "処方履歴", bg: "bg-pink-100 text-pink-700", selected: false },
                    { label: "お問合せ", bg: "bg-slate-100 text-slate-600", selected: false },
                  ].map((b, i) => (
                    <div key={i} className={`relative flex items-center justify-center py-6 text-[10px] font-bold ${b.bg} ${b.selected ? "border-2 border-dashed border-blue-500" : ""}`}>
                      {b.label}
                      {/* 選択中のエリアにリサイズハンドル表示 */}
                      {b.selected && (
                        <>
                          <span className="absolute top-0 left-0 h-2 w-2 bg-blue-500" />
                          <span className="absolute top-0 right-0 h-2 w-2 bg-blue-500" />
                          <span className="absolute bottom-0 left-0 h-2 w-2 bg-blue-500" />
                          <span className="absolute bottom-0 right-0 h-2 w-2 bg-blue-500" />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 text-center text-[10px] text-slate-400">ドラッグして領域を設定</div>
              </div>
              <div>
                <div className="mb-2 text-[10px] font-semibold text-slate-500">ボタン1: 予約する</div>
                <div className="space-y-1.5">
                  {[
                    { label: "アクション", val: "URI — 予約ページを開く" },
                    { label: "追加アクション 1", val: "タグ付与 →「予約意向あり」" },
                    { label: "追加アクション 2", val: "マーク変更 →「対応中」" },
                  ].map((a) => (
                    <div key={a.label} className="rounded-md bg-slate-50 px-2.5 py-2"><div className="text-[10px] text-slate-400">{a.label}</div><div className="text-[11px] font-medium text-slate-700">{a.val}</div></div>
                  ))}
                  <div className="rounded-md border border-dashed border-blue-300 px-2.5 py-1.5 text-center text-[10px] text-blue-500">+ アクション追加</div>
                </div>
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* フォームビルダー + アクション自動化 (2カラムグリッド) */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-lg font-extrabold text-slate-900">回答フォームビルダー</h4>
            <p className="mb-4 text-[13px] text-slate-500">問診票・アンケート・同意書などをGUIで作成。回答データは管理画面に自動集約。</p>
            <MockWindow title="フォーム回答一覧">
              <div>
                <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-semibold text-slate-700">初診問診票</span><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">公開中</span></div>
                <div className="overflow-hidden rounded-lg border border-slate-100">
                  <div className="grid grid-cols-4 gap-px bg-slate-100">{["回答者", "年齢", "主訴", "日時"].map((h) => <div key={h} className="bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-500">{h}</div>)}</div>
                  {[
                    { name: "星野 さくら", age: "32歳", chief: "肌荒れ", date: "2/7" },
                    { name: "青山 はるか", age: "28歳", chief: "シミ", date: "2/7" },
                    { name: "朝日 翔太", age: "41歳", chief: "AGA", date: "2/6" },
                  ].map((r) => (
                    <div key={r.name} className="grid grid-cols-4 gap-px border-t border-slate-100">
                      <div className="bg-white px-2 py-1.5 text-[10px] font-medium text-slate-700">{r.name}</div>
                      <div className="bg-white px-2 py-1.5 text-[10px] text-slate-500">{r.age}</div>
                      <div className="bg-white px-2 py-1.5 text-[10px] text-slate-500">{r.chief}</div>
                      <div className="bg-white px-2 py-1.5 text-[10px] text-slate-400">{r.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </MockWindow>
          </div>
          <div>
            <h4 className="mb-2 text-lg font-extrabold text-slate-900">アクション自動化</h4>
            <p className="mb-4 text-[13px] text-slate-500">友だち追加→挨拶→タグ付与→メニュー切替をステップで構築。条件分岐にも対応。</p>
            <MockWindow title="アクション編集">
              <div className="space-y-1">
                {[
                  { step: 1, type: "メッセージ送信", detail: "ご登録ありがとうございます！", icon: "💬", color: "border-blue-200 bg-blue-50" },
                  { step: 2, type: "タグ付与", detail: "「新規登録」タグを付与", icon: "🏷️", color: "border-violet-200 bg-violet-50" },
                  { step: 3, type: "条件分岐", detail: "タグ「美容」を含む場合 →", icon: "🔀", color: "border-amber-200 bg-amber-50" },
                  { step: 4, type: "テンプレート送信", detail: "美容メニューご案内（5分後）", icon: "📋", color: "border-sky-200 bg-sky-50" },
                  { step: 5, type: "リッチメニュー切替", detail: "美容患者用メニューに変更", icon: "📱", color: "border-pink-200 bg-pink-50" },
                ].map((s, i) => (
                  <div key={s.step}>
                    <div className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${s.color}`}>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-500 shadow-sm">{s.step}</span>
                      <span className="text-sm">{s.icon}</span>
                      <div><div className="text-[10px] font-semibold text-slate-700">{s.type}</div><div className="text-[10px] text-slate-400">{s.detail}</div></div>
                    </div>
                    {i < 4 && <div className="ml-5 flex h-3 items-center"><div className="h-full w-px bg-slate-200" /></div>}
                  </div>
                ))}
              </div>
            </MockWindow>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* C-8b. AI機能 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="pt-8" />
        <CategoryHeader label="AI機能" title="AIがクリニック業務を加速する" desc="AIによる自動返信・カルテ生成・リッチメニューデザインで、スタッフの作業時間を大幅に削減。" />

        {/* AIリッチメニュー自動生成 */}
        <FeatureBlock title="AIリッチメニュー自動生成" desc="クリニックの業種やイメージカラーを指定するだけで、AIがプロ品質のリッチメニューデザインを自動生成。デザイナーへの外注が不要になり、数分でLINEメニューを完成させることができます。" details={["業種・テーマ・カラーを指定するだけ", "AIがSVG→PNG変換でメニュー画像を自動生成", "生成後そのままリッチメニューとして反映可能", "何度でも再生成・調整が可能"]}>
          <MockWindow title="AIリッチメニュー生成">
            <div className="space-y-3">
              <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[12px]">✨</span>
                  <span className="text-[11px] font-semibold text-violet-700">AI自動生成</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[10px] text-slate-400">業種</span>
                    <span className="rounded bg-white px-2 py-1 text-[11px] text-slate-600">美容クリニック</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[10px] text-slate-400">テーマ</span>
                    <span className="rounded bg-white px-2 py-1 text-[11px] text-slate-600">清潔感・高級感</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[10px] text-slate-400">カラー</span>
                    <div className="flex gap-1">
                      <span className="h-5 w-5 rounded bg-blue-500" />
                      <span className="h-5 w-5 rounded bg-sky-300" />
                      <span className="h-5 w-5 rounded bg-white border border-slate-200" />
                    </div>
                  </div>
                </div>
                <button className="mt-3 w-full rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 py-2 text-[11px] font-bold text-white">AIで生成する</button>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold text-slate-500">生成結果プレビュー</div>
                <div className="grid grid-cols-3 grid-rows-2 gap-[2px] overflow-hidden rounded-lg border border-blue-200">
                  {[
                    { label: "予約する", bg: "bg-gradient-to-br from-blue-500 to-sky-400 text-white" },
                    { label: "問診フォーム", bg: "bg-gradient-to-br from-sky-400 to-blue-300 text-white" },
                    { label: "お知らせ", bg: "bg-gradient-to-br from-blue-400 to-sky-300 text-white" },
                    { label: "マイページ", bg: "bg-gradient-to-br from-sky-300 to-blue-200 text-blue-800" },
                    { label: "処方履歴", bg: "bg-gradient-to-br from-blue-200 to-sky-200 text-blue-800" },
                    { label: "お問合せ", bg: "bg-gradient-to-br from-sky-200 to-blue-100 text-blue-700" },
                  ].map((b, i) => (
                    <div key={i} className={`flex items-center justify-center py-5 text-[10px] font-bold ${b.bg}`}>{b.label}</div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="flex-1 rounded-md border border-slate-200 py-1.5 text-[10px] font-semibold text-slate-500">再生成</button>
                  <button className="flex-1 rounded-md bg-blue-500 py-1.5 text-[10px] font-bold text-white">このデザインを使用</button>
                </div>
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* フロービルダー */}
        <FeatureBlock title="フロービルダー" desc="複雑な患者対応フローをビジュアルエディタで構築。友だち追加→問診→予約→フォローアップまでの一連の流れを、ドラッグ&ドロップで直感的に設計できます。" details={["ビジュアルエディタでフロー全体を俯瞰", "条件分岐・遅延・並列処理に対応", "テンプレートから素早くフロー作成"]} reverse>
          <MockWindow title="LINE管理 — フロービルダー">
            <div className="space-y-1">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">新患獲得フロー</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600">稼働中</span>
              </div>
              {/* フロー図 */}
              <div className="flex flex-col items-center gap-0">
                <div className="rounded-lg border-2 border-blue-300 bg-blue-50 px-4 py-2 text-center">
                  <div className="text-[10px] text-slate-400">トリガー</div>
                  <div className="text-[11px] font-semibold text-blue-700">友だち追加</div>
                </div>
                <div className="h-4 w-px bg-slate-300" />
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-center">
                  <div className="text-[10px] text-slate-400">アクション</div>
                  <div className="text-[11px] font-semibold text-sky-700">挨拶メッセージ送信</div>
                </div>
                <div className="h-4 w-px bg-slate-300" />
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-center">
                  <div className="text-[10px] text-slate-400">条件分岐</div>
                  <div className="text-[11px] font-semibold text-amber-700">問診回答済み？</div>
                </div>
                <div className="flex gap-8">
                  <div className="flex flex-col items-center">
                    <div className="h-4 w-px bg-slate-300" />
                    <span className="text-[9px] text-emerald-500 font-bold">YES</span>
                    <div className="h-2 w-px bg-slate-300" />
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-center">
                      <div className="text-[10px] font-semibold text-emerald-700">予約案内</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-4 w-px bg-slate-300" />
                    <span className="text-[9px] text-rose-500 font-bold">NO</span>
                    <div className="h-2 w-px bg-slate-300" />
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-center">
                      <div className="text-[10px] font-semibold text-rose-700">リマインド送信</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">実行回数: 1,234</span>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600">完了率: 78%</span>
              </div>
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* フォローアップルール */}
        <FeatureBlock title="フォローアップ自動配信" desc="診察後や処方後に、最適なタイミングで自動フォローアップメッセージを配信。副作用確認・満足度調査・再診促進まで、患者との継続的な関係構築を自動化します。" details={["診察後X日後に自動送信", "処方薬別のフォローテンプレート", "再診促進への自動エスカレーション"]}>
          <MockWindow title="LINE管理 — フォローアップルール">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">設定中のルール</span>
                <span className="rounded bg-blue-500 px-3 py-1 text-[10px] font-bold text-white">+ 新規作成</span>
              </div>
              {[
                { name: "処方後3日 — 副作用確認", timing: "処方3日後", target: "全処方患者", sent: "487件", status: "有効", sc: "text-emerald-600 bg-emerald-50" },
                { name: "処方後14日 — 効果確認", timing: "処方14日後", target: "初回処方患者", sent: "312件", status: "有効", sc: "text-emerald-600 bg-emerald-50" },
                { name: "処方後30日 — 再診促進", timing: "処方30日後", target: "再処方未申請", sent: "156件", status: "有効", sc: "text-emerald-600 bg-emerald-50" },
              ].map((r) => (
                <div key={r.name} className="rounded-lg border border-slate-100 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">{r.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.sc}`}>{r.status}</span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-slate-400">
                    <span>タイミング: {r.timing}</span>
                    <span>対象: {r.target}</span>
                    <span>送信実績: {r.sent}</span>
                  </div>
                </div>
              ))}
            </div>
          </MockWindow>
        </FeatureBlock>

        {/* Flex Messageビルダー & メニュー自動切替 (2カラムグリッド) */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-lg font-extrabold text-slate-900">Flex Messageビルダー</h4>
            <p className="mb-4 text-[13px] text-slate-500">リッチなカード型メッセージをノーコードで作成。プリセットから選んですぐに配信可能。</p>
            <MockWindow title="Flex Message — エディタ">
              <div>
                <div className="mb-2 text-[10px] font-semibold text-slate-500">プリセット選択</div>
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {["ボタン型", "画像カード", "カルーセル"].map((t, i) => (
                    <div key={t} className={`rounded-lg border p-2 text-center text-[10px] ${i === 0 ? "border-blue-300 bg-blue-50 font-semibold text-blue-700" : "border-slate-200 text-slate-500"}`}>{t}</div>
                  ))}
                </div>
                <div className="rounded-lg border border-blue-200 bg-gradient-to-b from-blue-50 to-white p-3">
                  <div className="rounded bg-blue-500 px-3 py-2 text-center text-[11px] font-bold text-white">再診のご案内</div>
                  <div className="mt-2 text-[10px] text-slate-500 text-center">前回のご来院から3ヶ月が経過しました。ご都合の良い日時をお選びください。</div>
                  <div className="mt-2 rounded bg-blue-500 px-3 py-1.5 text-center text-[10px] font-bold text-white">予約する →</div>
                </div>
              </div>
            </MockWindow>
          </div>
          <div>
            <h4 className="mb-2 text-lg font-extrabold text-slate-900">リッチメニュー自動切替</h4>
            <p className="mb-4 text-[13px] text-slate-500">患者の状態（タグ・マーク・来院回数等）に応じて、リッチメニューを自動で切り替え。初診・再診・VIPなど段階別のUXを実現。</p>
            <MockWindow title="LINE管理 — メニュー切替ルール">
              <div className="space-y-2">
                {[
                  { cond: 'タグ「初診」を含む', menu: "初診患者メニュー", priority: "1" },
                  { cond: 'タグ「VIP」を含む', menu: "VIP専用メニュー", priority: "2" },
                  { cond: "来院回数 ≥ 3回", menu: "リピーターメニュー", priority: "3" },
                  { cond: "デフォルト", menu: "一般メニュー", priority: "—" },
                ].map((r) => (
                  <div key={r.cond} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-50 text-[10px] font-bold text-blue-600">{r.priority}</span>
                    <div className="flex-1"><div className="text-[11px] font-medium text-slate-700">{r.cond}</div><div className="text-[10px] text-slate-400">→ {r.menu}</div></div>
                  </div>
                ))}
              </div>
            </MockWindow>
          </div>
        </div>

      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════ STRENGTHS ═══ */
function Strengths() {
  return (
    <Section id="strengths" className="bg-slate-900 text-white">
      <div className="text-center">
        <span className="mb-4 inline-block rounded-full bg-blue-500/10 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-blue-400 uppercase">STRENGTHS</span>
        <h2 className="mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-white md:text-4xl">Lオペ for CLINIC が選ばれる<br className="md:hidden" />3つの理由</h2>
        <p className="mx-auto mb-16 max-w-2xl text-[14px] leading-relaxed text-slate-400">汎用LINEマーケツールでもなく、単なる予約システムでもない。クリニック業務に深く入り込んだ「現場起点」の設計思想が最大の差別化です。</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { num: "01", title: "クリニック専用設計", sub: "vs. 汎用LINEツール", points: ["Lステップ等は飲食・EC向け。医療特有の「問診→予約→診療→処方→フォロー」導線に未対応", "患者CRM・対応マーク・処方管理・配送追跡まで、クリニック業務フローに完全特化", "友だち追加時の自動問診誘導・診療後の自動フォローなど医療最適シナリオをプリセット"] },
          { num: "02", title: "真のオールインワン", sub: "vs. 単機能SaaS複数利用", points: ["予約＋LINE配信＋会計＋配送管理…月額10万超のツール代を1本に集約", "「LINE登録→問診→予約→来院→決済→配送」まで1画面で追跡。データ分断ゼロ", "スタッフのツール間移動・二重入力がゼロに。学習コストも大幅削減"] },
          { num: "03", title: "ノーコードで現場完結", sub: "vs. エンジニア依存", points: ["リッチメニュー・フォーム・自動アクションの構築がすべてGUI操作で完結", "「キャンペーン用リッチメニューを差し替えたい」→管理画面から即反映。開発待ちゼロ", "条件分岐・遅延送信・セグメント配信も直感操作。ITに詳しくないスタッフでも運用可能"] },
        ].map((s) => (
          <div key={s.num} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-7 backdrop-blur">
            <div className="mb-3 bg-gradient-to-r from-blue-400 to-sky-400 bg-clip-text text-3xl font-black text-transparent">{s.num}</div>
            <h3 className="mb-1 text-lg font-bold">{s.title}</h3>
            <p className="mb-5 text-[11px] font-semibold text-blue-400">{s.sub}</p>
            <ul className="space-y-3">{s.points.map((p, i) => <li key={i} className="flex gap-3 text-[12px] leading-relaxed text-slate-300"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[8px] text-blue-400">&#10003;</span>{p}</li>)}</ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════ USE CASES ═══ */
function UseCases() {
  return (
    <Section id="usecases" className="bg-slate-50/50">
      <div className="text-center"><Label>USE CASES</Label><Title>現場のリアルな1日で見る活用シーン</Title><Sub>クリニックの日常業務がどう変わるのか、場面ごとに具体的にご紹介します。</Sub></div>
      <div className="space-y-20">

        {/* ── シーン1: 朝の業務開始 ── */}
        <div>
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow">01</span>
            <div><h3 className="text-xl font-extrabold text-slate-900">朝の業務開始</h3><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">ダッシュボード</span></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 課題 */}
            <div>
              <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] text-rose-500">&#10005;</span><span className="text-[15px] font-bold text-rose-600">課題</span></div>
              <p className="mb-4 text-[15px] leading-relaxed text-slate-600">予約台帳・売上表・LINE管理画面を3つ開いて確認。毎朝15分のロスが発生している。</p>
              <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                <div className="grid grid-cols-3 gap-3">
                  {["予約台帳.xlsx", "売上表.xlsx", "LINE公式"].map((t) => (
                    <div key={t} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                      <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-[14px]">{t.includes("LINE") ? "💬" : "📄"}</div>
                      <div className="text-[11px] text-slate-500">{t}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-[12px] text-rose-400">3つのツールを行き来して毎朝確認...</p>
              </div>
            </div>
            {/* 変化 */}
            <div>
              <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-600">&#10003;</span><span className="text-[15px] font-bold text-blue-600">変化</span></div>
              <p className="mb-4 text-[15px] leading-relaxed text-slate-600">ダッシュボード1画面で予約数・売上・対応状況を一覧。1分で業務スタート。</p>
              <MockWindow title="ダッシュボード">
                <div className="grid grid-cols-3 gap-2">
                  {[{ l: "本日の予約", v: "24件", c: "text-blue-600", bg: "bg-blue-50" }, { l: "月間売上", v: "¥3.2M", c: "text-amber-600", bg: "bg-amber-50" }, { l: "未対応", v: "3件", c: "text-rose-600", bg: "bg-rose-50" }].map((k) => (
                    <div key={k.l} className={`rounded-lg ${k.bg} p-2.5 text-center`}>
                      <div className="text-[10px] text-slate-400">{k.l}</div>
                      <div className={`text-[15px] font-bold ${k.c}`}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
                  <div className="mb-1 text-[10px] font-semibold text-slate-400">月間売上推移</div>
                  <div className="flex items-end gap-0.5" style={{ height: 40 }}>
                    {[30, 45, 35, 55, 50, 65, 72, 58, 68, 75, 62, 80].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-400 to-sky-300" style={{ height: `${h}%` }} />)}
                  </div>
                </div>
              </MockWindow>
            </div>
          </div>
        </div>

        {/* ── シーン2: 新患の友だち追加 ── */}
        <div>
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow">02</span>
            <div><h3 className="text-xl font-extrabold text-slate-900">新患の友だち追加</h3><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">アクション自動化</span></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] text-rose-500">&#10005;</span><span className="text-[15px] font-bold text-rose-600">課題</span></div>
              <p className="mb-4 text-[15px] leading-relaxed text-slate-600">友だち追加後に手動で挨拶メッセージを送り、問診票URLを別途送付する手間がかかる。</p>
              <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                <div className="space-y-2">
                  {["① 友だち追加を確認", "② 手動で挨拶メッセージ送信", "③ 問診票URLをコピーして送付", "④ 対応済みをメモに記録"].map((s) => (
                    <div key={s} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[12px] text-slate-500">
                      <span className="text-rose-400">→</span>{s}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-[12px] text-rose-400">すべて手作業で対応漏れのリスクあり</p>
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-600">&#10003;</span><span className="text-[15px] font-bold text-blue-600">変化</span></div>
              <p className="mb-4 text-[15px] leading-relaxed text-slate-600">友だち追加と同時に挨拶・問診フォーム案内・リッチメニュー切替が全自動で実行。</p>
              <MockWindow title="アクション自動化">
                <div className="space-y-1.5">
                  {[
                    { s: "1", l: "挨拶メッセージ送信", d: "友だち追加直後", c: "border-blue-200 bg-blue-50" },
                    { s: "2", l: "問診フォーム案内", d: "30秒後", c: "border-sky-200 bg-sky-50" },
                    { s: "3", l: "タグ「新規」付与", d: "即時", c: "border-violet-200 bg-violet-50" },
                    { s: "4", l: "リッチメニュー切替", d: "即時", c: "border-pink-200 bg-pink-50" },
                  ].map((a, i) => (
                    <div key={a.s}>
                      <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${a.c}`}>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-500 shadow-sm">{a.s}</span>
                        <div><div className="text-[12px] font-semibold text-slate-700">{a.l}</div><div className="text-[10px] text-slate-400">{a.d}</div></div>
                      </div>
                      {i < 3 && <div className="ml-6 flex h-2 items-center"><div className="h-full w-px bg-slate-200" /></div>}
                    </div>
                  ))}
                </div>
              </MockWindow>
            </div>
          </div>
        </div>

        {/* ── シーン3: 再診促進の配信 ── */}
        <div>
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow">03</span>
            <div><h3 className="text-xl font-extrabold text-slate-900">再診促進の配信</h3><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">セグメント配信</span></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] text-rose-500">&#10005;</span><span className="text-[15px] font-bold text-rose-600">課題</span></div>
              <p className="mb-4 text-[15px] leading-relaxed text-slate-600">Excelで該当患者を手動抽出し、一人ずつLINE送信。半日がかりの作業。</p>
              <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="grid grid-cols-4 gap-px bg-slate-100 text-[10px] font-semibold text-slate-400">{["名前", "最終来院", "タグ", "送信"].map((h) => <div key={h} className="bg-slate-50 px-2 py-1.5">{h}</div>)}</div>
                  {[{ n: "A様", d: "11/5", t: "美容", s: "未送信" }, { n: "B様", d: "10/20", t: "美容", s: "未送信" }, { n: "C様", d: "10/8", t: "美容", s: "未送信" }].map((r) => (
                    <div key={r.n} className="grid grid-cols-4 gap-px border-t border-slate-100 text-[10px] text-slate-500">{[r.n, r.d, r.t, r.s].map((v, vi) => <div key={vi} className="bg-white px-2 py-1.5">{v}</div>)}</div>
                  ))}
                </div>
                <p className="mt-3 text-center text-[12px] text-rose-400">142人を1件ずつ手動で送信...</p>
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-600">&#10003;</span><span className="text-[15px] font-bold text-blue-600">変化</span></div>
              <p className="mb-4 text-[15px] leading-relaxed text-slate-600">セグメント条件を設定しテンプレートで一括配信。わずか10分で完了。</p>
              <MockWindow title="セグメント配信">
                <div className="mb-3 rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 text-[11px] font-semibold text-slate-500">配信条件</div>
                  <div className="flex flex-wrap gap-2">
                    {["最終来院: 3ヶ月以上前", "タグ: 美容"].map((t) => <span key={t} className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-600">{t}</span>)}
                  </div>
                </div>
                <div className="mb-3 rounded-lg bg-blue-50 p-3">
                  <div className="flex items-center justify-between">
                    <div><div className="text-[11px] text-slate-400">対象</div><div className="text-lg font-bold text-blue-600">142人</div></div>
                    <div><div className="text-[11px] text-slate-400">テンプレート</div><div className="text-[12px] font-medium text-slate-600">再診のご案内</div></div>
                  </div>
                </div>
                <button className="w-full rounded-lg bg-blue-500 py-2.5 text-[12px] font-bold text-white">配信を実行する</button>
              </MockWindow>
            </div>
          </div>
        </div>

        {/* ── シーン4: 予約前日のリマインド ── */}
        <div>
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow">04</span>
            <div><h3 className="text-xl font-extrabold text-slate-900">予約前日のリマインド</h3><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">リマインド配信</span></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] text-rose-500">&#10005;</span><span className="text-[15px] font-bold text-rose-600">課題</span></div>
              <p className="mb-4 text-[15px] leading-relaxed text-slate-600">受付スタッフが電話で1件ずつリマインド連絡。1時間以上のルーティン作業。</p>
              <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="rounded-full bg-white p-3 shadow"><span className="text-2xl">📞</span></div>
                  <div className="text-[13px] text-slate-500">
                    <div>星野 さくら様 → 電話 → 不在</div>
                    <div>青山 はるか様 → 電話 → 確認OK</div>
                    <div>緑川 大輝様 → 電話 → 留守電</div>
                    <div className="text-rose-400">...あと21件</div>
                  </div>
                </div>
                <p className="mt-3 text-center text-[12px] text-rose-400">電話が繋がらず何度もかけ直し...</p>
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-600">&#10003;</span><span className="text-[15px] font-bold text-blue-600">変化</span></div>
              <p className="mb-4 text-[15px] leading-relaxed text-slate-600">予約患者へLINEリマインドを一括送信。送信結果もリアルタイムで確認。</p>
              <MockWindow title="リマインド一括送信">
                <div className="mb-3 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2.5">
                  <span className="text-[12px] font-semibold text-blue-700">明日の予約: 24件</span>
                  <span className="rounded bg-blue-500 px-3 py-1 text-[11px] font-bold text-white">一括送信</span>
                </div>
                <div className="space-y-1.5">
                  {[{ n: "星野 さくら", t: "10:00", s: "送信済み" }, { n: "青山 はるか", t: "10:30", s: "送信済み" }, { n: "緑川 大輝", t: "11:00", s: "送信済み" }, { n: "白石 あおい", t: "11:30", s: "送信済み" }].map((r) => (
                    <div key={r.n} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <div className="flex items-center gap-3"><span className="text-[12px] font-medium text-slate-700">{r.n}</span><span className="text-[10px] text-slate-400">{r.t}</span></div>
                      <span className="text-[11px] font-bold text-blue-600">{r.s}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center text-[13px] font-bold text-blue-600">24件 送信完了</div>
              </MockWindow>
            </div>
          </div>
        </div>

        {/* ── シーン5: 処方後の配送 ── */}
        <div>
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow">05</span>
            <div><h3 className="text-xl font-extrabold text-slate-900">処方後の配送</h3><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">配送管理</span></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] text-rose-500">&#10005;</span><span className="text-[15px] font-bold text-rose-600">課題</span></div>
              <p className="mb-4 text-[15px] leading-relaxed text-slate-600">配送業者サイトで送り状を個別作成し、追跡番号を手動でLINE送信。</p>
              <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                <div className="space-y-2">
                  {["① 配送業者サイトで送り状を1件ずつ入力", "② 追跡番号をメモにコピー", "③ LINEで患者に追跡番号を個別送信"].map((s) => (
                    <div key={s} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[12px] text-slate-500">
                      <span className="text-rose-400">→</span>{s}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-[12px] text-rose-400">コピペミスで追跡番号の取り違えリスク</p>
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-600">&#10003;</span><span className="text-[15px] font-bold text-blue-600">変化</span></div>
              <p className="mb-4 text-[15px] leading-relaxed text-slate-600">配送CSVをワンクリック出力 → 追跡番号一括登録 → 患者へ自動通知。</p>
              <MockWindow title="配送管理">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-700">本日出荷予定: 8件</span>
                  <span className="rounded bg-blue-500 px-3 py-1 text-[11px] font-bold text-white">配送CSV出力</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { n: "星野 さくら", s: "出荷待ち", sc: "text-amber-600 bg-amber-50" },
                    { n: "青山 はるか", s: "出荷済み", sc: "text-blue-600 bg-blue-50", tr: "4912-3456-7890" },
                    { n: "朝日 翔太", s: "配達完了", sc: "text-emerald-600 bg-emerald-50", tr: "4912-1234-5678" },
                  ].map((r) => (
                    <div key={r.n} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-[12px] font-medium text-slate-700">{r.n}</span>
                      <div className="flex items-center gap-2">
                        {r.tr && <span className="text-[10px] text-slate-400">{r.tr}</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.sc}`}>{r.s}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-slate-400 text-center">追跡番号登録時にLINE自動通知</div>
              </MockWindow>
            </div>
          </div>
        </div>

        {/* ── シーン6: 月末の経営分析 ── */}
        <div>
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow">06</span>
            <div><h3 className="text-xl font-extrabold text-slate-900">月末の経営分析</h3><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">売上管理</span></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] text-rose-500">&#10005;</span><span className="text-[15px] font-bold text-rose-600">課題</span></div>
              <p className="mb-4 text-[15px] leading-relaxed text-slate-600">クレカ管理・銀行口座・予約台帳を突き合わせてExcelで集計。丸1日の作業。</p>
              <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                <div className="grid grid-cols-3 gap-2">
                  {["クレカ管理画面", "銀行口座明細", "予約台帳Excel"].map((t) => (
                    <div key={t} className="rounded-lg border border-slate-200 bg-white p-2.5 text-center">
                      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-[12px]">📄</div>
                      <div className="text-[10px] text-slate-500">{t}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-center gap-1 text-[12px] text-rose-400">
                  <span>→ 手動で突き合わせ →</span><span className="font-bold">丸1日</span>
                </div>
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-600">&#10003;</span><span className="text-[15px] font-bold text-blue-600">変化</span></div>
              <p className="mb-4 text-[15px] leading-relaxed text-slate-600">売上ダッシュボードで月間KPIを即確認。CSVエクスポートもワンクリック。</p>
              <MockWindow title="売上管理 — 月次レポート">
                <div className="grid grid-cols-3 gap-2">
                  {[{ l: "月間売上", v: "¥4.8M", c: "text-blue-600", bg: "bg-blue-50" }, { l: "前月比", v: "+12%", c: "text-emerald-600", bg: "bg-emerald-50" }, { l: "リピート率", v: "68%", c: "text-violet-600", bg: "bg-violet-50" }].map((k) => (
                    <div key={k.l} className={`rounded-lg ${k.bg} p-2.5 text-center`}>
                      <div className="text-[10px] text-slate-400">{k.l}</div>
                      <div className={`text-[15px] font-bold ${k.c}`}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
                  <div className="mb-1 text-[10px] font-semibold text-slate-400">月間売上推移</div>
                  <div className="flex items-end gap-0.5" style={{ height: 48 }}>
                    {[40, 55, 48, 62, 58, 70, 65, 75, 68, 80, 72, 85].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-400 to-sky-300" style={{ height: `${h}%` }} />)}
                  </div>
                </div>
                <div className="mt-2 flex justify-end"><span className="rounded bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-500">CSV出力</span></div>
              </MockWindow>
            </div>
          </div>
        </div>

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
      <div className="text-center"><Label>FLOW</Label><Title>導入の流れ</Title><Sub>お問い合わせから最短2週間で運用開始。初期設定はサポートチームが代行するため、現場の負担はほぼゼロです。</Sub></div>
      <div className="mx-auto max-w-3xl">
        {steps.map((s, i) => (
          <div key={s.num} className="flex gap-5">
            <div className="flex flex-col items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[12px] font-bold text-white shadow-lg shadow-blue-500/20">{s.num}</div>
              {i < steps.length - 1 && <div className="my-1 h-full w-px bg-blue-200/60" />}
            </div>
            <div className={i < steps.length - 1 ? "pb-10" : ""}><h4 className="mb-1 text-[15px] font-bold">{s.title}</h4><p className="text-[13px] leading-relaxed text-slate-400">{s.desc}</p></div>
          </div>
        ))}
      </div>
      <div className="mt-12 text-center"><span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-6 py-2.5 text-[12px] font-semibold text-amber-700">最短2週間で導入完了 / 初期設定代行あり</span></div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════ PRICING ═══ */
function Pricing() {
  const plans = [
    { name: "ライト", msgs: "5,000通", price: "¥4,000", per: "¥1.0/通" },
    { name: "スタンダード", msgs: "30,000通", price: "¥17,000", per: "¥0.7/通", pop: true },
    { name: "プロ", msgs: "50,000通", price: "¥26,000", per: "¥0.6/通" },
    { name: "ビジネス", msgs: "100,000通", price: "¥70,000", per: "¥0.5/通" },
  ];
  const bigPlans = [
    { name: "ビジネス30万", msgs: "300,000通", price: "¥105,000", per: "¥0.4/通" },
    { name: "ビジネス50万", msgs: "500,000通", price: "¥115,000", per: "¥0.3/通" },
    { name: "ビジネス100万", msgs: "1,000,000通", price: "¥158,000", per: "¥0.2/通" },
  ];
  const options = [
    { name: "AI返信", price: "¥20,000", desc: "AIによるLINE自動返信" },
    { name: "音声入力", price: "¥15,000", desc: "音声からテキスト変換" },
    { name: "AIカルテ", price: "¥20,000", desc: "AI自動カルテ生成" },
  ];
  return (
    <Section id="pricing" className="bg-gradient-to-b from-white to-blue-50/20">
      <div className="text-center"><Label>PRICING</Label><Title>料金プラン</Title><Sub>メッセージ送信量に応じた従量課金制。全機能が使えて、Lステップより約20%おトクです。</Sub></div>

      {/* メッセージプラン */}
      <div className="mx-auto mt-10 max-w-5xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div key={p.name} className={`rounded-2xl border-2 bg-white p-6 text-center shadow-sm transition hover:shadow-lg ${p.pop ? "border-blue-500 shadow-blue-100/40 relative" : "border-slate-200"}`}>
              {p.pop && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white">人気</span>}
              <h3 className="text-[15px] font-bold text-slate-800">{p.name}</h3>
              <p className="mt-1 text-[12px] text-slate-400">{p.msgs}/月</p>
              <div className="mt-4 text-3xl font-extrabold text-blue-600">{p.price}<span className="text-sm font-normal text-slate-400">/月</span></div>
              <p className="mt-1 text-[11px] text-slate-400">超過分 {p.per}</p>
            </div>
          ))}
        </div>

        {/* 大量プラン */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-slate-50">{["大量送信プラン", "込み通数", "月額（税込）", "超過単価"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500">{h}</th>)}</tr></thead>
            <tbody>
              {bigPlans.map((p) => (
                <tr key={p.name} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{p.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.msgs}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">{p.price}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.per}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-400 text-center">全プランで全機能利用可 / 初期費用: ¥300,000〜（導入支援込み）</p>
      </div>

      {/* AIオプション */}
      <div className="mx-auto mt-12 max-w-3xl">
        <h3 className="mb-4 text-center text-[15px] font-bold text-slate-700">AIオプション（月額追加）</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((o) => (
            <div key={o.name} className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <h4 className="text-[14px] font-bold text-slate-800">{o.name}</h4>
              <p className="mt-1 text-[11px] text-slate-400">{o.desc}</p>
              <div className="mt-3 text-xl font-extrabold text-blue-600">+{o.price}<span className="text-sm font-normal text-slate-400">/月</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Lステップ比較 */}
      <div className="mx-auto mt-14 max-w-4xl">
        <h3 className="mb-5 text-center text-[15px] font-bold text-slate-700">Lステップとの価格比較</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-blue-50">{["通数", "Lオペ（税込）", "Lステップ（税込）", "おトク額"].map((h) => <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>)}</tr></thead>
            <tbody>
              {[
                { msgs: "5,000通", lope: "¥4,000", lstep: "¥5,000", save: "¥1,000" },
                { msgs: "30,000通", lope: "¥17,000", lstep: "¥21,780", save: "¥4,780" },
                { msgs: "50,000通", lope: "¥26,000", lstep: "¥32,780", save: "¥6,780" },
                { msgs: "100,000通", lope: "¥70,000", lstep: "¥87,780", save: "¥17,780" },
              ].map((r) => (
                <tr key={r.msgs} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{r.msgs}</td>
                  <td className="px-4 py-2.5 font-bold text-blue-600">{r.lope}</td>
                  <td className="px-4 py-2.5 text-slate-400 line-through">{r.lstep}</td>
                  <td className="px-4 py-2.5 font-bold text-green-600">{r.save} おトク</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">※ Lステップ価格は2025年公開情報に基づく。Lオペは全CRM・予約・配送機能込み。</p>
      </div>

      <div className="mt-10 text-center">
        <a href="#contact" className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-10 py-4 text-[13px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl">まずは資料請求（無料）</a>
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
      <div className="text-center"><Label>FAQ</Label><Title>よくあるご質問</Title></div>
      <div className="mx-auto mt-8 max-w-3xl divide-y divide-slate-200/80">
        {faqs.map((f, i) => (
          <div key={i}>
            <button className="flex w-full items-center justify-between py-5 text-left" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
              <span className="flex items-start gap-3 text-[13px] font-semibold text-slate-700 md:text-[14px]"><span className="mt-0.5 shrink-0 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Q</span>{f.q}</span>
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
    <section id="contact" className="bg-gradient-to-br from-blue-500 via-sky-500 to-blue-400 px-5 py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-[1.7rem] font-extrabold leading-snug text-white md:text-4xl">LINE活用で、<br className="md:hidden" />クリニック経営を次のステージへ</h2>
        <p className="mx-auto mb-10 max-w-xl text-[14px] leading-relaxed text-blue-100">まずは資料請求から。貴院の課題に合わせたデモのご案内も可能です。</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="mailto:info@example.com" className="w-full rounded-xl bg-white px-10 py-4 text-[13px] font-bold text-blue-700 shadow-lg transition hover:bg-blue-50 sm:w-auto">資料請求・お問い合わせ</a>
          <a href="#" className="w-full rounded-xl border-2 border-white/25 px-10 py-4 text-[13px] font-bold text-white transition hover:bg-white/10 sm:w-auto">無料オンライン相談を予約</a>
        </div>
        <p className="mt-6 text-[11px] text-blue-200">※ 無理な営業は一切行いません</p>
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
          <div className="flex items-center gap-2 text-[14px] font-bold text-white"><Image src="/images/l-ope-logo.png" alt="Lオペ" width={140} height={140} className="object-contain" />Lオペ for CLINIC</div>
          <div className="flex flex-wrap justify-center gap-6 text-[12px]">
            {["機能", "強み", "活用シーン", "料金", "FAQ", "お問い合わせ"].map((l) => <a key={l} href={`#${l === "機能" ? "features" : l === "強み" ? "strengths" : l === "活用シーン" ? "usecases" : l === "料金" ? "pricing" : l === "FAQ" ? "faq" : "contact"}`} className="hover:text-white">{l}</a>)}
          </div>
        </div>
        <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-7 text-[11px] md:flex-row">
          <div className="flex gap-5"><a href="#" className="hover:text-white">利用規約</a><a href="#" className="hover:text-white">プライバシーポリシー</a><a href="#" className="hover:text-white">特定商取引法に基づく表記</a></div>
          <p>&copy; 2025 Lオペ for CLINIC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
